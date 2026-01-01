/**
 * Score Tool
 * LangChain tool for structured scoring output from judge agent
 */

import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * 评分结果 Schema
 */
export const ScoreResultSchema = z.object({
  logic: z.number().min(1).max(10).describe("逻辑性评分 (1-10)"),
  rebuttal: z.number().min(1).max(10).describe("反驳能力评分 (1-10)"),
  clarity: z.number().min(1).max(10).describe("清晰度评分 (1-10)"),
  evidence: z.number().min(1).max(10).describe("论据充分性评分 (1-10)"),
  comment: z.string().max(200).describe("评语 (200字以内)"),
  fouls: z.array(z.string()).optional().describe("犯规类型列表"),
});

export type ScoreResult = z.infer<typeof ScoreResultSchema>;

/**
 * 裁判评分工具
 * 用于从 LLM 获取结构化的 JSON 评分输出
 */
export class JudgeScoreTool extends StructuredTool {
  name = "judge_score";
  description =
    "对辩论发言进行评分，包括逻辑性、反驳能力、清晰度和论据充分性四个维度。每个维度1-10分，并提供简短评语。";

  schema = ScoreResultSchema;

  async _call(input: z.infer<typeof ScoreResultSchema>): Promise<string> {
    // 这个工具主要用于定义输出结构
    // 实际的评分逻辑在 judge-chain.ts 中执行
    return JSON.stringify(input);
  }
}

/**
 * 创建评分工具实例
 */
export function createJudgeScoreTool(): JudgeScoreTool {
  return new JudgeScoreTool();
}

/**
 * 解析 LLM 响应为评分结果
 */
export function parseScoreResult(content: string): ScoreResult | null {
  try {
    // 尝试提取 JSON 代码块
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    // 解析并验证
    const result = ScoreResultSchema.parse(JSON.parse(jsonString));

    // 确保评分在有效范围内
    return {
      logic: Math.max(1, Math.min(10, result.logic)),
      rebuttal: Math.max(1, Math.min(10, result.rebuttal)),
      clarity: Math.max(1, Math.min(10, result.clarity)),
      evidence: Math.max(1, Math.min(10, result.evidence)),
      comment: result.comment,
      fouls: result.fouls || [],
    };
  } catch (error) {
    console.error("Failed to parse score result:", error);
    return null;
  }
}

/**
 * 默认评分（解析失败时使用）
 */
export function getDefaultScoreResult(comment: string = "评分解析失败，使用默认分"): ScoreResult {
  return {
    logic: 5,
    rebuttal: 5,
    clarity: 5,
    evidence: 5,
    comment,
    fouls: [],
  };
}
