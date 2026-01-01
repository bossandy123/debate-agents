/**
 * Request Tool
 * LangChain tool for audience to request speaking time
 */

import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * 观众发言申请结果 Schema
 */
export const RequestResultSchema = z.object({
  wantsToSpeak: z.boolean().describe("是否希望发言"),
  content: z.string().max(200).describe("发言内容或问题 (200字以内)"),
});

export type RequestResult = z.infer<typeof RequestResultSchema>;

/**
 * 观众申请发言工具
 * 用于从 LLM 获取结构化的发言申请输出
 */
export class AudienceRequestTool extends StructuredTool {
  name = "audience_request";
  description =
    "观众决定是否申请发言参与辩论。如果希望发言，提供有价值的问题或观点；否则保持沉默。";

  schema = RequestResultSchema;

  async _call(input: z.infer<typeof RequestResultSchema>): Promise<string> {
    // 这个工具主要用于定义输出结构
    // 实际的申请逻辑在 audience-chain.ts 中执行
    return JSON.stringify(input);
  }
}

/**
 * 创建观众发言申请工具实例
 */
export function createAudienceRequestTool(): AudienceRequestTool {
  return new AudienceRequestTool();
}

/**
 * 解析 LLM 响应为发言申请结果
 */
export function parseRequestResult(content: string): RequestResult | null {
  try {
    // 尝试提取 JSON 代码块
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    // 解析并验证
    return RequestResultSchema.parse(JSON.parse(jsonString));
  } catch (error) {
    console.error("Failed to parse request result:", error);
    return null;
  }
}

/**
 * 默认发言申请结果（解析失败时使用）
 */
export function getDefaultRequestResult(): RequestResult {
  return {
    wantsToSpeak: false,
    content: "",
  };
}

/**
 * 发言申请结果辅助函数
 */
export function shouldAllowSpeak(result: RequestResult): boolean {
  // 只有希望发言且有内容时才允许
  return result.wantsToSpeak && result.content.trim().length > 0;
}

/**
 * 投票结果 Schema
 */
export const VoteResultSchema = z
  .object({
    vote: z.enum(["pro", "con"]).describe("投票选择 (支持正方或反方)"),
    reason: z.string().max(100).describe("投票理由 (100字以内)"),
  })
  .strict();

export type VoteResult = z.infer<typeof VoteResultSchema>;

/**
 * 观众投票工具
 * 用于从 LLM 获取结构化的投票输出
 */
export class AudienceVoteTool extends StructuredTool {
  name = "audience_vote";
  description =
    "观众在辩论结束后根据双方论点和表现进行投票，选择支持正方或反方，并给出简短理由。";

  schema = VoteResultSchema;

  async _call(input: z.infer<typeof VoteResultSchema>): Promise<string> {
    // 这个工具主要用于定义输出结构
    // 实际的投票逻辑在 audience-chain.ts 中执行
    return JSON.stringify(input);
  }
}

/**
 * 创建观众投票工具实例
 */
export function createAudienceVoteTool(): AudienceVoteTool {
  return new AudienceVoteTool();
}

/**
 * 解析 LLM 响应为投票结果
 */
export function parseVoteResult(content: string): VoteResult | null {
  try {
    // 尝试提取 JSON 代码块
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    // 解析并验证
    return VoteResultSchema.parse(JSON.parse(jsonString));
  } catch (error) {
    console.error("Failed to parse vote result:", error);
    return null;
  }
}

/**
 * 根据评分决定默认投票（解析失败时使用）
 */
export function getDefaultVoteResult(
  proScore: number,
  conScore: number,
  reason: string = "投票解析失败，根据评分决定"
): VoteResult {
  return {
    vote: proScore >= conScore ? "pro" : "con",
    reason,
  };
}
