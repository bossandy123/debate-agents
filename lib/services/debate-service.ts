/**
 * Debate Service
 * 辩论流程编排服务，负责管理整个辩论流程
 */

import { debateRepository } from "@/lib/repositories/debate.repository";
import { agentRepository } from "@/lib/repositories/agent.repository";
import { roundRepository } from "@/lib/repositories/round.repository";
import { messageRepository } from "@/lib/repositories/message.repository";
import { scoreRepository } from "@/lib/repositories/score.repository";
import { audienceRequestRepository } from "@/lib/repositories/audience-request.repository";
import { sseService } from "@/lib/services/sse-service";
import { langchainService } from "@/lib/services/langchain-service";
import { memoryService } from "@/lib/services/memory-service";
import { canRequestToSpeak } from "@/lib/models/audience-request";
import type { Agent } from "@/lib/models/agent";
import type { Phase } from "@/lib/models/round";
import type { LLMConfig } from "@/lib/langchain/config";

/**
 * 辩论会话状态
 */
export interface DebateSession {
  debateId: number;
  status: "running" | "paused" | "stopped" | "completed";
  currentRound: number;
  totalRounds: number;
  startedAt: Date;
  abortController?: AbortController;
}

/**
 * 轮次执行结果
 */
interface RoundExecutionResult {
  success: boolean;
  error?: string;
}

/**
 * 辩论服务单例
 * 管理所有活跃辩论会话
 */
class DebateService {
  /**
   * 活跃辩论会话映射表
   */
  private activeDebates = new Map<number, DebateSession>();

  /**
   * 最大并发辩论数量
   */
  private readonly MAX_CONCURRENT_DEBATES = 3;

  /**
   * 当前运行的辩论数量
   */
  get runningDebates(): number {
    return Array.from(this.activeDebates.values()).filter(
      (d) => d.status === "running"
    ).length;
  }

  /**
   * 启动辩论
   */
  async startDebate(debateId: number): Promise<void> {
    // 检查并发限制
    if (this.runningDebates >= this.MAX_CONCURRENT_DEBATES) {
      throw new Error(
        `已达到最大并发辩论数量限制 (${this.MAX_CONCURRENT_DEBATES})，请稍后再试`
      );
    }

    // 检查辩论是否存在
    const debate = debateRepository.findById(debateId);
    if (!debate) {
      throw new Error(`辩论 ${debateId} 不存在`);
    }

    // 检查辩论状态
    if (debate.status === "running") {
      throw new Error(`辩论 ${debateId} 正在运行中`);
    }

    if (debate.status === "completed") {
      throw new Error(`辩论 ${debateId} 已完成，无法重复启动`);
    }

    // 获取辩论配置的 Agents
    const agents = agentRepository.findByDebateId(debateId);
    const debaters = agents.filter((a) => a.role === "debater");
    const judge = agents.find((a) => a.role === "judge");

    if (debaters.length !== 2) {
      throw new Error(`辩论需要 2 名辩手，当前只有 ${debaters.length} 名`);
    }

    if (!judge) {
      throw new Error("辩论需要 1 名裁判");
    }

    // 检查正反方配置
    const proDebater = debaters.find((a) => a.stance === "pro");
    const conDebater = debaters.find((a) => a.stance === "con");

    if (!proDebater || !conDebater) {
      throw new Error("辩论需要正方和反方各一名辩手");
    }

    try {
      // 创建会话
      const session: DebateSession = {
        debateId,
        status: "running",
        currentRound: 0,
        totalRounds: debate.max_rounds,
        startedAt: new Date(),
        abortController: new AbortController(),
      };

      this.activeDebates.set(debateId, session);

      // 清理已有的轮次数据（如果是重新启动失败的辩论）
      const existingRounds = roundRepository.findByDebateId(debateId);
      if (existingRounds.length > 0) {
        console.log(`清理辩论 ${debateId} 的旧轮次数据`);
        roundRepository.deleteByDebateId(debateId);
        // 同时清理相关的消息和评分数据
        messageRepository.deleteByDebateId(debateId);
        scoreRepository.deleteByDebateId(debateId);
        audienceRequestRepository.deleteByDebateId(debateId);
      }

      // 更新辩论状态
      debateRepository.setStarted(debateId);

      // 注意：不再等待 SSE 订阅者，因为 Next.js 开发模式的热重载会导致订阅者丢失
      // 前端会通过轮询数据库状态来同步

      // 发送辩论开始事件（如果有订阅者的话）
      sseService.broadcast(debateId, {
        type: "debate_start",
        data: {
          debate_id: debateId,
          topic: debate.topic,
          max_rounds: debate.max_rounds,
        },
      });

      // 在后台执行辩论流程
      this.runDebate(session).catch((error) => {
        console.error(`辩论 ${debateId} 执行失败:`, error);
        this.handleDebateError(debateId, error);
      });
    } catch (error) {
      // 清理已创建的 session
      this.activeDebates.delete(debateId);
      throw error;
    }
  }

  /**
   * 停止辩论（幂等操作）
   */
  stopDebate(debateId: number): void {
    const session = this.activeDebates.get(debateId);

    if (session) {
      // 防止重复停止
      if (session.status === "stopped") {
        return;
      }

      session.status = "stopped";

      // 中断辩论执行
      if (session.abortController) {
        session.abortController.abort();
      }

      // 发送停止事件
      sseService.broadcast(debateId, {
        type: "debate_stopped",
        data: { debate_id: debateId },
      });

      // 清理会话
      this.activeDebates.delete(debateId);
      sseService.clearDebate(debateId);
    }

    // 更新数据库状态（只在确实是 running 状态时）
    const debate = debateRepository.findById(debateId);
    if (debate && debate.status === "running") {
      debateRepository.updateStatus(debateId, "failed");
    }
  }

  /**
   * 执行完整辩论流程
   */
  private async runDebate(session: DebateSession): Promise<void> {
    const { debateId, totalRounds, abortController } = session;

    try {
      // 逐轮执行辩论
      for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber++) {
        // 检查是否被中断
        if (abortController?.signal.aborted) {
          throw new Error("辩论被用户中断");
        }

        // 更新当前轮次
        session.currentRound = roundNumber;

        // 执行单轮辩论
        const result = await this.executeRound(debateId, roundNumber);

        if (!result.success) {
          throw new Error(`第 ${roundNumber} 轮执行失败: ${result.error}`);
        }

        // 轮次间隔（避免 API 限流）
        if (roundNumber < totalRounds) {
          await this.sleep(1000);
        }
      }

      // 所有轮次完成，计算最终结果
      await this.finalizeDebate(debateId);
    } catch (error) {
      throw error;
    } finally {
      // 清理会话
      this.activeDebates.delete(debateId);
    }
  }

  /**
   * 执行单轮辩论
   */
  private async executeRound(
    debateId: number,
    roundNumber: number
  ): Promise<RoundExecutionResult> {
    try {
      const debate = debateRepository.findById(debateId);
      if (!debate) {
        return { success: false, error: "辩论不存在" };
      }

      // 确定轮次阶段
      const phase = this.getPhase(roundNumber, debate.max_rounds);

      // 创建轮次记录
      const round = roundRepository.create({
        debate_id: debateId,
        sequence: roundNumber,
        phase,
        type: "standard",
      });

      // 发送轮次开始事件
      sseService.broadcast(debateId, {
        type: "round_start",
        data: {
          round_id: round.id,
          sequence: roundNumber,
          phase,
        },
      });

      // 获取辩手和裁判
      const agents = agentRepository.findByDebateId(debateId);
      const proDebater = agents.find((a) => a.role === "debater" && a.stance === "pro");
      const conDebater = agents.find((a) => a.role === "debater" && a.stance === "con");
      const judge = agents.find((a) => a.role === "judge");

      if (!proDebater || !conDebater || !judge) {
        return { success: false, error: "缺少必要的 Agent" };
      }

      // 获取对话历史
      const history = await memoryService.getConversationHistory(debateId, roundNumber - 1);

      // Pro 发言
      const proContent = await this.executeAgentSpeech(
        debateId,
        round.id,
        proDebater,
        debate,
        roundNumber,
        history,
        "pro"
      );

      if (!proContent) {
        return { success: false, error: "正方发言失败" };
      }

      // Con 发言
      const conContent = await this.executeAgentSpeech(
        debateId,
        round.id,
        conDebater,
        debate,
        roundNumber,
        history,
        "con"
      );

      if (!conContent) {
        return { success: false, error: "反方发言失败" };
      }

      // 裁判评分
      await this.executeJudgeScoring(
        debateId,
        round.id,
        judge,
        debate,
        roundNumber,
        proDebater,
        conDebater,
        proContent,
        conContent
      );

      // 处理观众申请发言（仅在第3-6轮）
      if (canRequestToSpeak(roundNumber)) {
        await this.executeAudienceRequests(
          debateId,
          round.id,
          debate,
          roundNumber,
          judge,
          history
        );
      }

      // 标记轮次完成
      roundRepository.markCompleted(round.id);

      // 发送轮次结束事件
      sseService.broadcast(debateId, {
        type: "round_end",
        data: {
          round_id: round.id,
          sequence: roundNumber,
        },
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 执行 Agent 发言
   */
  private async executeAgentSpeech(
    debateId: number,
    roundId: number,
    agent: Agent,
    debate: { topic: string; pro_definition?: string; con_definition?: string; max_rounds: number },
    roundNumber: number,
    _history: Array<{ role: string; stance?: string; content: string }>,
    stance: "pro" | "con"
  ): Promise<string | null> {
    try {
      // 发送 Agent 开始发言事件
      sseService.broadcast(debateId, {
        type: "agent_start",
        data: {
          agent_id: agent.id,
          role: agent.role,
          stance,
        },
      });

      // 构建 LLM 配置
      const llmConfig: LLMConfig = {
        provider: agent.model_provider,
        model: agent.model_name,
        temperature: 0.7,
        streaming: true,
        ...(agent.api_key && { apiKey: agent.api_key }),
        ...(agent.base_url && { baseURL: agent.base_url }),
      };

      // 执行流式发言
      const result = await langchainService.streamDebaterSpeech(
        debateId,
        roundNumber,
        agent.id,
        stance,
        debate.topic,
        debate.pro_definition || "",
        debate.con_definition || "",
        debate.max_rounds,
        llmConfig,
        agent.style_tag
      );

      // 保存消息到数据库（包含 token 数量）
      await memoryService.addMessage(roundId, agent.id, result.content, result.tokenCount);

      // 发送 Agent 发言结束事件
      sseService.broadcast(debateId, {
        type: "agent_end",
        data: {
          agent_id: agent.id,
          content: result.content,
        },
      });

      return result.content;
    } catch (error) {
      console.error(`Agent ${agent.id} 发言失败:`, error);
      sseService.broadcast(debateId, {
        type: "error",
        data: {
          error: `Agent 发言失败: ${error instanceof Error ? error.message : String(error)}`,
        },
      });
      return null;
    }
  }

  /**
   * 执行裁判评分
   */
  private async executeJudgeScoring(
    debateId: number,
    roundId: number,
    judge: Agent,
    debate: { topic: string; max_rounds: number },
    roundNumber: number,
    proAgent: Agent,
    conAgent: Agent,
    proContent: string,
    conContent: string
  ): Promise<void> {
    try {
      // 构建裁判 LLM 配置
      const llmConfig: LLMConfig = {
        provider: judge.model_provider,
        model: judge.model_name,
        temperature: 0.3, // 评分使用较低温度以获得稳定输出
        ...(judge.api_key && { apiKey: judge.api_key }),
        ...(judge.base_url && { baseURL: judge.base_url }),
      };

      // 对正方评分
      const proScore = await langchainService.executeJudgeScoring(
        debateId,
        roundNumber,
        "pro",
        proContent,
        debate.topic,
        debate.max_rounds,
        llmConfig
      );

      // 保存正方评分
      scoreRepository.create({
        round_id: roundId,
        agent_id: proAgent.id,
        logic: proScore.logic,
        rebuttal: proScore.rebuttal,
        clarity: proScore.clarity,
        evidence: proScore.evidence,
        comment: proScore.comment,
      });

      // 对反方评分
      const conScore = await langchainService.executeJudgeScoring(
        debateId,
        roundNumber,
        "con",
        conContent,
        debate.topic,
        debate.max_rounds,
        llmConfig
      );

      // 保存反方评分
      scoreRepository.create({
        round_id: roundId,
        agent_id: conAgent.id,
        logic: conScore.logic,
        rebuttal: conScore.rebuttal,
        clarity: conScore.clarity,
        evidence: conScore.evidence,
        comment: conScore.comment,
      });

      // 发送评分更新事件
      sseService.broadcast(debateId, {
        type: "score_update",
        data: {
          round_id: roundId,
          scores: {
            pro: {
              agent_id: proAgent.id,
              ...proScore,
              total: proScore.logic + proScore.rebuttal + proScore.clarity + proScore.evidence,
            },
            con: {
              agent_id: conAgent.id,
              ...conScore,
              total: conScore.logic + conScore.rebuttal + conScore.clarity + conScore.evidence,
            },
          },
        },
      });
    } catch (error) {
      console.error(`裁判评分失败:`, error);
      sseService.broadcast(debateId, {
        type: "error",
        data: {
          error: `裁判评分失败: ${error instanceof Error ? error.message : String(error)}`,
        },
      });
    }
  }

  /**
   * 执行观众申请发言流程（第3-6轮）
   */
  private async executeAudienceRequests(
    debateId: number,
    roundId: number,
    debate: { topic: string; max_rounds: number; pro_definition?: string; con_definition?: string },
    roundNumber: number,
    judge: Agent,
    history: Array<{ role: string; stance?: string; content: string }>
  ): Promise<void> {
    try {
      const agents = agentRepository.findByDebateId(debateId);
      const audienceAgents = agents.filter((a) => a.role === "audience");

      if (audienceAgents.length === 0) {
        return; // 没有观众 Agent，跳过
      }

      // 获取本轮对话历史
      const recentConversation = history
        .slice(-4) // 最近4条发言
        .map((h) => `[${h.stance?.toUpperCase() || h.role}]: ${h.content}`)
        .join("\n");

      // 收集所有观众申请
      const requests = [];

      for (const audience of audienceAgents) {
        try {
          // 构建 LLM 配置
          const llmConfig: LLMConfig = {
            provider: audience.model_provider,
            model: audience.model_name,
            temperature: 0.7,
            ...(audience.api_key && { apiKey: audience.api_key }),
            ...(audience.base_url && { baseURL: audience.base_url }),
          };

          // 调用观众申请 Chain
          const chain = await import("@/lib/agents/chains/audience-chain");
          const requestChain = chain.createAudienceRequestChain();
          const result = await requestChain.execute({
            topic: debate.topic,
            roundNumber,
            maxRounds: debate.max_rounds,
            proDefinition: debate.pro_definition || "",
            conDefinition: debate.con_definition || "",
            recentConversation,
            audienceType: audience.audience_type || "rational",
            llmConfig,
          });

          if (result.wantsToSpeak && result.content) {
            // 创建观众申请记录
            const request = audienceRequestRepository.create({
              round_id: roundId,
              agent_id: audience.id,
              intent: result.content.includes("正方") || result.content.includes("支持正方")
                ? "support_pro"
                : "support_con",
              claim: result.content,
              novelty: "new", // 默认为新观点
              confidence: 0.8, // 默认置信度
            });
            requests.push({ request, agent: audience });
          }
        } catch (error) {
          console.error(`观众 ${audience.id} 申请失败:`, error);
        }
      }

      if (requests.length === 0) {
        return; // 没有观众申请，跳过
      }

      // 发送观众申请事件
      sseService.broadcast(debateId, {
        type: "audience_requests",
        data: {
          round_id: roundId,
          requests_count: requests.length,
        },
      });

      // 裁判审批每个申请
      const approvedRequests = [];

      for (const { request, agent } of requests) {
        try {
          // 构建裁判 LLM 配置
          const judgeLlmConfig: LLMConfig = {
            provider: judge.model_provider,
            model: judge.model_name,
            temperature: 0.3,
            ...(judge.api_key && { apiKey: judge.api_key }),
            ...(judge.base_url && { baseURL: judge.base_url }),
          };

          // 构建轮次上下文
          const roundContext = `本轮已结束正反双方发言，观众 ${agent.audience_type} 申请下场发言，核心观点：${request.claim}`;

          // 调用裁判审批
          const approval = await langchainService.executeAudienceApproval(
            debateId,
            debate.topic,
            roundNumber,
            debate.max_rounds,
            request.id,
            agent.audience_type || "rational",
            request.intent,
            request.claim,
            request.novelty,
            request.confidence,
            roundContext,
            judgeLlmConfig
          );

          // 更新审批状态
          if (approval.approved) {
            audienceRequestRepository.approve(request.id, approval.comment);
            approvedRequests.push({ request, agent });
          } else {
            audienceRequestRepository.reject(request.id, approval.comment);
          }

          // 发送审批结果事件
          sseService.broadcast(debateId, {
            type: "audience_approval",
            data: {
              request_id: request.id,
              agent_id: agent.id,
              approved: approval.approved,
              comment: approval.comment,
            },
          });
        } catch (error) {
          console.error(`审批申请 ${request.id} 失败:`, error);
          // 默认拒绝
          audienceRequestRepository.reject(request.id, "审批失败");
        }
      }

      // 批准的观众发言
      for (const { request, agent } of approvedRequests) {
        try {
          sseService.broadcast(debateId, {
            type: "agent_start",
            data: {
              agent_id: agent.id,
              role: "audience",
            },
          });

          // 构建观众 LLM 配置
          const llmConfig: LLMConfig = {
            provider: agent.model_provider,
            model: agent.model_name,
            temperature: 0.8,
            streaming: true,
            ...(agent.api_key && { apiKey: agent.api_key }),
            ...(agent.base_url && { baseURL: agent.base_url }),
          };

          // 执行观众发言（使用 debater chain）
          const result = await langchainService.streamDebaterSpeech(
            debateId,
            roundNumber,
            agent.id,
            request.intent === "support_pro" ? "pro" : "con",
            debate.topic,
            debate.pro_definition || "",
            debate.con_definition || "",
            debate.max_rounds,
            llmConfig,
            agent.audience_type
          );

          // 保存消息到数据库
          await memoryService.addMessage(roundId, agent.id, result.content, result.tokenCount);

          // 发送观众发言结束事件
          sseService.broadcast(debateId, {
            type: "audience_speech",
            data: {
              agent_id: agent.id,
              audience_type: agent.audience_type,
              content: result.content,
            },
          });
        } catch (error) {
          console.error(`观众 ${agent.id} 发言失败:`, error);
          sseService.broadcast(debateId, {
            type: "error",
            data: {
              error: `观众发言失败: ${error instanceof Error ? error.message : String(error)}`,
            },
          });
        }
      }
    } catch (error) {
      console.error(`观众申请流程失败:`, error);
      // 观众申请失败不影响辩论继续
    }
  }

  /**
   * 完成辩论并计算最终结果
   */
  private async finalizeDebate(debateId: number): Promise<void> {
    try {
      const debate = debateRepository.findById(debateId);
      if (!debate) {
        throw new Error("辩论不存在");
      }

      // 计算总分
      const scores = scoreRepository.calculateTotalScores(debateId);

      // 计算加权结果
      const judgeWeight = debate.judge_weight || 0.5;
      // TODO: 观众投票功能未实现，后续会使用此权重
      // const audienceWeight = debate.audience_weight || 0.5;

      // 目前只有裁判评分，后续可以添加观众投票
      const proJudgeScore = scores.get("pro")?.total || 0;
      const conJudgeScore = scores.get("con")?.total || 0;

      const proFinalScore = proJudgeScore * judgeWeight;
      const conFinalScore = conJudgeScore * judgeWeight;

      // 判定胜负
      let winner: "pro" | "con" | "draw";
      if (Math.abs(proFinalScore - conFinalScore) < 0.1) {
        winner = "draw";
      } else {
        winner = proFinalScore > conFinalScore ? "pro" : "con";
      }

      // 更新辩论状态
      debateRepository.setCompleted(debateId, winner);

      // 发送辩论结束事件
      sseService.broadcast(debateId, {
        type: "debate_end",
        data: {
          debate_id: debateId,
          winner,
          final_scores: {
            pro: proFinalScore,
            con: conFinalScore,
          },
          judge_scores: {
            pro: proJudgeScore,
            con: conJudgeScore,
          },
        },
      });

      // 清理 SSE 连接
      setTimeout(() => {
        sseService.clearDebate(debateId);
      }, 5000);
    } catch (error) {
      console.error(`完成辩论失败:`, error);
      throw error;
    }
  }

  /**
   * 处理辩论错误
   */
  private handleDebateError(debateId: number, error: unknown): void {
    console.error(`辩论 ${debateId} 出错:`, error);

    // 更新辩论状态为失败
    debateRepository.setFailed(debateId);

    // 发送错误事件
    sseService.broadcast(debateId, {
      type: "error",
      data: {
        error: error instanceof Error ? error.message : "未知错误",
      },
    });

    // 清理会话
    this.activeDebates.delete(debateId);
    sseService.clearDebate(debateId);
  }

  /**
   * 根据轮次确定辩论阶段
   */
  private getPhase(roundNumber: number, maxRounds: number): Phase {
    if (roundNumber <= 2) {
      return "opening";
    }
    if (roundNumber >= maxRounds) {
      return "closing";
    }
    return "rebuttal";
  }

  /**
   * 获取辩论会话
   */
  getSession(debateId: number): DebateSession | undefined {
    return this.activeDebates.get(debateId);
  }

  /**
   * 检查辩论是否正在运行
   */
  isRunning(debateId: number): boolean {
    const session = this.activeDebates.get(debateId);
    return session ? session.status === "running" : false;
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 导出单例
export const debateService = new DebateService();
export default debateService;
