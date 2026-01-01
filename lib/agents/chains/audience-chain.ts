/**
 * Audience Chain
 * LangChain chain implementation for audience agents
 */

import { z } from "zod";
import { createLLM, type LLMConfig } from "@/lib/langchain/config";
import {
  createAudienceVotingPrompt,
  createAudienceRequestPrompt,
  createAudienceFeedbackPrompt,
} from "@/lib/agents/prompts/audience-prompts";

/**
 * 观众投票 Schema（Zod 验证）
 */
export const AudienceVoteOutputSchema = z.object({
  vote: z.enum(["pro", "con", "draw"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(500),
});

export type AudienceVoteOutput = z.infer<typeof AudienceVoteOutputSchema>;

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
 * 观众投票输入
 */
export interface AudienceVotingInput {
  topic: string;
  proDefinition: string;
  conDefinition: string;
  proArguments: string;
  conArguments: string;
  proTotalScore: number;
  conTotalScore: number;
  audienceType: string;
  llmConfig: LLMConfig;
}

/**
 * 观众投票结果
 */
export interface AudienceVotingResult {
  vote: "pro" | "con" | "draw";
  confidence: number;
  reason: string;
}

/**
 * 观众申请发言输入
 */
export interface AudienceRequestInput {
  topic: string;
  roundNumber: number;
  maxRounds: number;
  proDefinition: string;
  conDefinition: string;
  recentConversation: string;
  audienceType: string;
  llmConfig: LLMConfig;
}

/**
 * 观众申请发言结果
 */
export interface AudienceRequestResult {
  wantsToSpeak: boolean;
  content: string;
}

/**
 * 观众反馈输入
 */
export interface AudienceFeedbackInput {
  topic: string;
  debateResult: string;
  audienceType: string;
  llmConfig: LLMConfig;
}

/**
 * 创建观众投票 Chain
 */
export function createAudienceVotingChain() {
  /**
   * 执行观众投票
   */
  async function executeVoting(input: AudienceVotingInput): Promise<AudienceVotingResult> {
    const {
      topic,
      proDefinition,
      conDefinition,
      proArguments,
      conArguments,
      proTotalScore,
      conTotalScore,
      audienceType,
      llmConfig,
    } = input;

    const promptTemplate = createAudienceVotingPrompt(audienceType);
    const prompt = await promptTemplate.format({
      topic,
      pro_definition: proDefinition,
      con_definition: conDefinition,
      pro_arguments: proArguments,
      con_arguments: conArguments,
      pro_total_score: proTotalScore,
      con_total_score: conTotalScore,
    });

    const llm = createLLM({ ...llmConfig, temperature: 0.5 });
    const response = await llm.invoke(prompt);

    const content = extractContent(response);

    // 解析 JSON 输出并使用 Zod 验证
    try {
      const jsonMatch = (content as string).match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      const parsed = JSON.parse(jsonString as string);

      // 使用 Zod 验证投票结果
      const result = AudienceVoteOutputSchema.parse(parsed);
      return result;
    } catch (error) {
      // 解析失败，根据分数决定投票
      console.error("Failed to parse audience vote:", error);

      // 计算默认置信度（基于分差）
      const scoreDiff = Math.abs(proTotalScore - conTotalScore);
      const maxDiff = Math.max(proTotalScore, conTotalScore);
      const confidence = maxDiff > 0 ? 1 - (scoreDiff / maxDiff) * 0.5 : 0.5;

      return {
        vote: proTotalScore >= conTotalScore ? "pro" : "con",
        confidence: Math.max(0.5, Math.min(1, confidence)),
        reason: "投票解析失败，根据评分决定",
      };
    }
  }

  return {
    execute: executeVoting,
  };
}

/**
 * 创建观众申请发言 Chain
 */
export function createAudienceRequestChain() {
  /**
   * 执行观众申请发言
   */
  async function executeRequest(
    input: AudienceRequestInput
  ): Promise<AudienceRequestResult> {
    const {
      topic,
      roundNumber,
      maxRounds,
      proDefinition,
      conDefinition,
      recentConversation,
      audienceType,
      llmConfig,
    } = input;

    const promptTemplate = createAudienceRequestPrompt(audienceType);
    const prompt = await promptTemplate.format({
      topic,
      round_number: roundNumber,
      max_rounds: maxRounds,
      pro_definition: proDefinition,
      con_definition: conDefinition,
      recent_conversation: recentConversation,
    });

    const llm = createLLM({ ...llmConfig, temperature: 0.7 });
    const response = await llm.invoke(prompt);

    const content = extractContent(response);

    // 解析 JSON 输出
    try {
      const jsonMatch = (content as string).match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      const result = JSON.parse(jsonString as string) as AudienceRequestResult;

      return result;
    } catch (error) {
      // 解析失败，默认不发言
      console.error("Failed to parse audience request:", error);
      return {
        wantsToSpeak: false,
        content: "",
      };
    }
  }

  return {
    execute: executeRequest,
  };
}

/**
 * 创建观众反馈 Chain
 */
export function createAudienceFeedbackChain() {
  /**
   * 执行观众反馈
   */
  async function executeFeedback(input: AudienceFeedbackInput): Promise<string> {
    const { topic, debateResult, audienceType, llmConfig } = input;

    const promptTemplate = createAudienceFeedbackPrompt(audienceType);
    const prompt = await promptTemplate.format({
      topic,
      debate_result: debateResult,
    });

    const llm = createLLM({ ...llmConfig, temperature: 0.7 });
    const response = await llm.invoke(prompt);

    return extractContent(response);
  }

  return {
    execute: executeFeedback,
  };
}

/**
 * 默认导出 - 投票 Chain
 */
export default createAudienceVotingChain();
