/**
 * Judge Chain
 * LangChain chain implementation for judge agent
 */

import { createLLM, type LLMConfig } from "@/lib/langchain/config";
import {
  createJudgeScoringPrompt,
  createJudgeSpeakingPrompt,
  createFoulDetectionPrompt,
  createAudienceApprovalPrompt,
} from "@/lib/agents/prompts/judge-prompts";

/**
 * 提取 LLM 响应的文本内容
 */
function extractContent(response: unknown): string {
  if (typeof response === "string") {
    return response;
  }
  if (typeof response === "object" && response !== null && "content" in response) {
    const content = (response as { content: unknown }).content;
    if (typeof content === "string") {
      return content;
    }
    if (Array.isArray(content)) {
      return content.map((c) => typeof c === "string" ? c : "").join("");
    }
  }
  return String(response);
}

/**
 * 评分结果
 */
export interface JudgeScoreResult {
  logic: number;
  rebuttal: number;
  clarity: number;
  evidence: number;
  comment: string;
  fouls?: Array<string>;
}

/**
 * 裁判 Chain 输入 - 评分
 */
export interface JudgeScoringInput {
  topic: string;
  roundNumber: number;
  maxRounds: number;
  agentStance: string;
  agentContent: string;
  llmConfig: LLMConfig;
}

/**
 * 裁判 Chain 输入 - 开场/总结发言
 */
export interface JudgeSpeakingInput {
  topic: string;
  roundNumber: number;
  maxRounds: number;
  phase: "opening" | "rebuttal" | "closing";
  previousRoundSummary?: string;
  llmConfig: LLMConfig;
}

/**
 * 犯规检测结果
 */
export interface FoulDetectionResult {
  hasFoul: boolean;
  foulType: string | null;
  reason: string | null;
}

/**
 * 观众申请审批结果
 */
export interface AudienceApprovalResult {
  approved: boolean;
  comment: string;
}

/**
 * 裁判 Chain 输入 - 审批观众申请
 */
export interface AudienceApprovalInput {
  topic: string;
  roundNumber: number;
  maxRounds: number;
  requestId: number;
  audienceType: string;
  intent: string;
  claim: string;
  novelty: string;
  confidence: number;
  roundContext: string;
  llmConfig: LLMConfig;
}

/**
 * 创建裁判评分 Chain
 */
export function createJudgeScoringChain() {
  /**
   * 执行裁判评分
   */
  async function executeScoring(input: JudgeScoringInput): Promise<JudgeScoreResult> {
    const { topic, roundNumber, maxRounds, agentStance, agentContent, llmConfig } =
      input;

    const promptTemplate = createJudgeScoringPrompt();
    const prompt = await promptTemplate.format({
      topic,
      round_number: roundNumber,
      max_rounds: maxRounds,
      agent_stance: agentStance,
      agent_content: agentContent,
      logic_desc: "逻辑性 - 论点是否清晰、推理是否严密、论据之间的逻辑关系是否连贯",
      rebuttal_desc: "反驳能力 - 是否有效回应对方观点、指出对方漏洞的能力",
      clarity_desc: "清晰度 - 表达是否清晰、有条理、易于理解",
      evidence_desc: "论据充分性 - 是否有充分的事实、数据或例证支持观点",
    });

    const llm = createLLM({ ...llmConfig, temperature: 0.3 }); // 较低温度以获得稳定输出
    console.log(`[JudgeChain] 开始调用 LLM: model=${llmConfig.model}, provider=${llmConfig.provider}, baseURL=${llmConfig.baseURL || 'default'}`);

    // 临时禁用 console.error 以抑制 "Unknown model" 警告
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('Failed to calculate number of tokens')) {
        return; // 忽略 token 计算警告
      }
      originalError.apply(console, args);
    };

    const response = await llm.invoke(prompt);

    // 恢复 console.error
    console.error = originalError;

    console.log(`[JudgeChain] LLM 调用成功, 响应类型: ${typeof response}`);

    const content = typeof response === "string" ? response : response.content;

    // 解析 JSON 输出
    try {
      const jsonMatch = (content as string).match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      const result = JSON.parse(jsonString as string) as JudgeScoreResult;

      // 验证评分范围
      result.logic = Math.max(1, Math.min(10, result.logic));
      result.rebuttal = Math.max(1, Math.min(10, result.rebuttal));
      result.clarity = Math.max(1, Math.min(10, result.clarity));
      result.evidence = Math.max(1, Math.min(10, result.evidence));

      return result;
    } catch (error) {
      // 如果解析失败，返回默认评分
      console.error("Failed to parse judge score:", error);
      return {
        logic: 5,
        rebuttal: 5,
        clarity: 5,
        evidence: 5,
        comment: "评分解析失败，使用默认分",
        fouls: [],
      };
    }
  }

  return {
    execute: executeScoring,
  };
}

/**
 * 创建裁判发言 Chain
 */
export function createJudgeSpeakingChain() {
  /**
   * 执行裁判发言
   */
  async function executeSpeaking(input: JudgeSpeakingInput): Promise<string> {
    const {
      topic,
      roundNumber,
      maxRounds,
      phase,
      previousRoundSummary,
      llmConfig,
    } = input;

    const promptTemplate = createJudgeSpeakingPrompt(phase);
    const prompt = await promptTemplate.format({
      topic,
      round_number: roundNumber,
      max_rounds: maxRounds,
      previous_round_summary:
        previousRoundSummary || "（这是第一轮，暂无上一轮情况）",
    });

    const llm = createLLM({ ...llmConfig, temperature: 0.7 });
    const response = await llm.invoke(prompt);

    return extractContent(response);
  }

  return {
    execute: executeSpeaking,
  };
}

/**
 * 创建犯规检测 Chain
 */
export function createFoulDetectionChain() {
  /**
   * 执行犯规检测
   */
  async function executeFoulDetection(
    input: Pick<JudgeScoringInput, "agentStance" | "agentContent" | "llmConfig">
  ): Promise<FoulDetectionResult> {
    const { agentStance, agentContent, llmConfig } = input;

    const promptTemplate = createFoulDetectionPrompt();
    const prompt = await promptTemplate.format({
      agent_stance: agentStance,
      agent_content: agentContent,
    });

    const llm = createLLM({ ...llmConfig, temperature: 0.1 }); // 低温度以获得稳定判断
    const response = await llm.invoke(prompt);

    const content = typeof response === "string" ? response : response.content;

    // 解析 JSON 输出
    try {
      const jsonMatch = (content as string).match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      return JSON.parse(jsonString as string) as FoulDetectionResult;
    } catch {
      // 解析失败，默认无犯规
      return {
        hasFoul: false,
        foulType: null,
        reason: null,
      };
    }
  }

  return {
    execute: executeFoulDetection,
  };
}

/**
 * 默认导出 - 评分 Chain
 */
export default createJudgeScoringChain();

/**
 * 创建观众申请审批 Chain
 */
export function createAudienceApprovalChain() {
  /**
   * 执行观众申请审批
   */
  async function executeApproval(input: AudienceApprovalInput): Promise<AudienceApprovalResult> {
    const {
      topic,
      roundNumber,
      maxRounds,
      requestId,
      audienceType,
      intent,
      claim,
      novelty,
      confidence,
      roundContext,
      llmConfig,
    } = input;

    const promptTemplate = createAudienceApprovalPrompt();
    const prompt = await promptTemplate.format({
      topic,
      round_number: roundNumber,
      max_rounds: maxRounds,
      request_id: requestId,
      audience_type: audienceType,
      intent,
      claim,
      novelty,
      confidence,
      round_context: roundContext,
    });

    const llm = createLLM({ ...llmConfig, temperature: 0.3 });
    const response = await llm.invoke(prompt);

    const content = extractContent(response);

    // 解析 JSON 输出
    try {
      const jsonMatch = (content as string).match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      const result = JSON.parse(jsonString as string) as AudienceApprovalResult;

      // 验证审批结果
      if (typeof result.approved !== "boolean") {
        throw new Error("Invalid approved value");
      }

      return result;
    } catch (error) {
      // 解析失败，默认拒绝
      console.error("Failed to parse audience approval:", error);
      return {
        approved: false,
        comment: "审批解析失败，默认拒绝",
      };
    }
  }

  return {
    execute: executeApproval,
  };
}
