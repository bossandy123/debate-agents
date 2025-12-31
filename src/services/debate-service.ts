import { DebateModel } from '../models/debate.js';
import { RoundModel } from '../models/round.js';
import { MessageModel } from '../models/message.js';
import { ScoreModel } from '../models/score.js';
import { RoundService } from './round-service.js';
import { ScoringService } from './scoring-service.js';
import { ContextManager, ContextSummary } from '../utils/context.js';
import { AgentFactory } from '../agents/factory.js';
import { BaseAgent } from '../agents/base.js';
import { JudgeAgent } from '../agents/judge.js';
import {
  DebateStatus,
  Message,
  DebateResult,
  CreateDebateRequest,
  VoteStance,
  LLMProvider,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * DebateService 类
 * 辩论流程编排服务，负责管理完整的10轮辩论流程
 */
export class DebateService {
  private readonly contextManager: ContextManager;
  private readonly agentFactory: AgentFactory;
  private scoringService: ScoringService | null = null;

  constructor(
    _llmService: unknown,
    contextManager: ContextManager,
    agentFactory: AgentFactory
  ) {
    this.contextManager = contextManager;
    this.agentFactory = agentFactory;
  }

  /**
   * 创建新辩论
   */
  async createDebate(request: CreateDebateRequest): Promise<DebateModel> {
    // 验证输入
    if (!request.topic || request.topic.trim().length === 0) {
      throw new Error('辩题不能为空');
    }

    if (!request.pro_model || !request.con_model) {
      throw new Error('必须指定正反方模型');
    }

    const maxRounds = request.max_rounds || 10;
    if (maxRounds < 1 || maxRounds > 20) {
      throw new Error('辩论轮数必须在1-20之间');
    }

    // 创建辩论记录
    const debate = await DebateModel.create(request.topic.trim());

    logger.info('创建新辩论', {
      debateId: debate.id,
      topic: request.topic,
      maxRounds,
    });

    return debate;
  }

  /**
   * 启动辩论
   * @param debateId 辩论ID
   */
  async startDebate(debateId: number): Promise<DebateResult> {
    // 获取辩论
    const debate = await DebateModel.findById(debateId);
    if (!debate) {
      throw new Error(`辩论 ${debateId} 不存在`);
    }

    if (!debate.isPending()) {
      throw new Error(`辩论 ${debateId} 状态不是待处理，无法启动`);
    }

    try {
      // 启动辩论
      await debate.start();

      // 创建Agents
      const agents = await this.agentFactory.createDebateAgents({
        debateId,
        proProvider: LLMProvider.OPENAI,
        proModel: 'gpt-4o',
        conProvider: LLMProvider.OPENAI,
        conModel: 'gpt-4o',
        judgeProvider: LLMProvider.OPENAI,
        judgeModel: 'gpt-4o',
        audienceCount: 0, // MVP阶段不启用观众
      });

      const judgeAgent = agents.judgeAgent as unknown as JudgeAgent;
      const scoringService = new ScoringService(judgeAgent);
      this.scoringService = scoringService;

      // 执行10轮辩论
      const result = await this.executeDebate(
        debate,
        agents.proAgent,
        agents.conAgent,
        judgeAgent,
        scoringService
      );

      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error(`辩论 ${debateId} 执行失败`, { error: errorMessage });

      // 标记辩论为失败
      await debate.fail(errorMessage);

      throw error;
    }
  }

  /**
   * 执行辩论流程
   */
  private async executeDebate(
    debate: DebateModel,
    proAgent: BaseAgent,
    conAgent: BaseAgent,
    judgeAgent: JudgeAgent,
    scoringService: ScoringService
  ): Promise<DebateResult> {
    const maxRounds = 10;
    const allMessages: Message[] = [];
    const rounds: RoundModel[] = [];

    logger.info(`开始执行辩论，共${maxRounds}轮`, {
      debateId: debate.id,
      topic: debate.topic,
    });

    // 执行10轮辩论
    for (let roundNum = 1; roundNum <= maxRounds; roundNum++) {
      const phase = RoundService.getPhaseForRoundNum(roundNum);

      logger.info(`执行第${roundNum}轮辩论`, {
        debateId: debate.id,
        phase,
      });

      // 检查是否需要压缩上下文
      let contextSummary: ContextSummary | undefined;
      if (this.contextManager.needsCompression(
        this.contextManager.buildContext(roundNum, allMessages)
      )) {
        contextSummary = await this.contextManager.generateSummary(
          allMessages,
          rounds.map(r => r.toObject())
        );
        logger.info(`生成上下文摘要`, { roundNum });
      }

      // 执行回合
      const result = await RoundService.createAndExecute(
        debate.id,
        roundNum,
        phase,
        proAgent,
        conAgent,
        {
          topic: debate.topic,
          allMessages,
        }
      );

      if (!result.success) {
        throw new Error(`第${roundNum}轮执行失败: ${result.error}`);
      }

      // 添加到消息列表
      allMessages.push(...result.messages);

      // 获取回合模型
      const round = await RoundModel.findById(result.roundId);
      if (round) {
        rounds.push(round);

        // 评分
        await scoringService.scoreRound(
          round,
          proAgent.id,
          conAgent.id,
          allMessages,
          debate.topic
        );
      }

      // 检查上下文长度
      const context = this.contextManager.buildContext(
        roundNum + 1,
        allMessages,
        contextSummary
      );
      const estimatedTokens = this.contextManager.estimateTokens(context);

      logger.debug(`第${roundNum}轮完成`, {
        messageCount: result.messages.length,
        totalMessages: allMessages.length,
        estimatedTokens,
      });
    }

    // 计算最终胜者
    const judgment = await scoringService.calculateWinner(
      rounds,
      debate.topic,
      allMessages
    );

    // 完成辩论
    await debate.complete(judgment.winner);

    // 获取评分汇总
    const scoreSummary = await scoringService.getScoreSummary(debate.id);

    logger.info(`辩论执行完成`, {
      debateId: debate.id,
      winner: judgment.winner,
      proTotal: scoreSummary.proTotal,
      conTotal: scoreSummary.conTotal,
    });

    return {
      debate: debate.toObject(),
      winner: judgment.winner,
      final_scores: {
        pro: scoreSummary.proTotal,
        con: scoreSummary.conTotal,
      },
      key_turning_round: judgment.keyTurningRound,
      blind_spots: judgment.blindSpots,
      audience_votes: [], // MVP阶段无观众投票
      judge_summary: judgment.summary,
    };
  }

  /**
   * 获取辩论详情
   */
  async getDebate(debateId: number): Promise<DebateModel | null> {
    return DebateModel.findById(debateId);
  }

  /**
   * 获取辩论的所有回合
   */
  async getRounds(debateId: number): Promise<Array<RoundModel & { phase: string }>> {
    const rounds = await RoundModel.findByDebateId(debateId);
    return rounds.map(r => ({ ...r.toObject(), phase: r.phase as string }));
  }

  /**
   * 获取回合消息
   */
  async getRoundMessages(roundId: number): Promise<Message[]> {
    const messages = await MessageModel.findByRoundId(roundId);
    return messages.map(m => m.toObject());
  }

  /**
   * 获取回合评分
   */
  async getRoundScores(roundId: number): Promise<Array<ReturnType<ScoreModel['toObject']>>> {
    const scores = await ScoreModel.findByRoundId(roundId);
    return scores.map(s => s.toObject());
  }

  /**
   * 获取辩论结果
   */
  async getDebateResult(debateId: number): Promise<DebateResult> {
    const debate = await DebateModel.findById(debateId);
    if (!debate) {
      throw new Error(`辩论 ${debateId} 不存在`);
    }

    if (!debate.isCompleted()) {
      throw new Error(`辩论 ${debateId} 尚未完成`);
    }

    // 获取评分汇总
    const scoringService = this.scoringService;
    if (!scoringService) {
      throw new Error('评分服务未初始化');
    }

    const scoreSummary = await scoringService.getScoreSummary(debateId);

    return {
      debate: debate.toObject(),
      winner: debate.winner || VoteStance.DRAW,
      final_scores: {
        pro: scoreSummary.proTotal,
        con: scoreSummary.conTotal,
      },
      key_turning_round: undefined,
      blind_spots: { pro: [], con: [] },
      audience_votes: [],
      judge_summary: '辩论已完成',
    };
  }

  /**
   * 获取辩论列表
   */
  async listDebates(options?: {
    status?: DebateStatus;
    limit?: number;
    offset?: number;
  }): Promise<DebateModel[]> {
    return DebateModel.findAll(options);
  }
}

export default DebateService;
