/**
 * Round 数据模型和类型定义
 * 代表辩论中的一个回合
 */

/**
 * 辩论阶段
 */
export type Phase = "opening" | "rebuttal" | "closing";

/**
 * 轮次类型
 */
export type RoundType = "standard" | "audience_request" | "finale";

/**
 * Round 实体
 */
export interface Round {
  id: number;
  debate_id: number;
  sequence: number; // 1-10
  phase: Phase;
  type: RoundType;
  started_at?: string;
  completed_at?: string;
}

/**
 * 获取轮次阶段
 * @param sequence 轮次序号 (1-10)
 * @returns 对应的阶段
 */
export function getPhase(sequence: number): Phase {
  if (sequence <= 2) return "opening";
  if (sequence <= 9) return "rebuttal";
  return "closing";
}

/**
 * 获取轮次类型（默认为 standard）
 * @param sequence 轮次序号
 * @param hasAudienceRequest 是否有观众申请
 * @returns 轮次类型
 */
export function getRoundType(
  sequence: number,
  hasAudienceRequest = false
): RoundType {
  if (sequence === 10) return "finale";
  if (hasAudienceRequest && sequence >= 3 && sequence <= 6) {
    return "audience_request";
  }
  return "standard";
}

/**
 * 验证轮次序号
 */
export function validateSequence(sequence: number): boolean {
  return sequence >= 1 && sequence <= 10;
}
