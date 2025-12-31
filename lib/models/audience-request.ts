/**
 * AudienceRequest 数据模型和类型定义
 * 代表观众 Agent 在第3-6轮申请下场发言的请求
 */

/**
 * 申请意图
 */
export type RequestIntent = "support_pro" | "support_con";

/**
 * 论点新颖性
 */
export type Novelty = "new" | "reinforcement";

/**
 * AudienceRequest 实体
 */
export interface AudienceRequest {
  id: number;
  round_id: number;
  agent_id: string;
  intent: RequestIntent;
  claim: string; // 核心观点
  novelty: Novelty;
  confidence: number; // 0-1
  approved: boolean;
  judge_comment?: string;
}

/**
 * 创建观众申请输入
 */
export interface CreateAudienceRequestInput {
  round_id: number;
  agent_id: string;
  intent: RequestIntent;
  claim: string;
  novelty: Novelty;
  confidence: number;
}

/**
 * 审批结果
 */
export interface ApprovalResult {
  approved: boolean;
  judge_comment?: string;
}

/**
 * 验证观众申请
 */
export function validateAudienceRequest(
  claim: string,
  confidence: number
): string[] {
  const errors: string[] = [];

  if (!claim || claim.trim().length === 0) {
    errors.push("核心观点不能为空");
  }

  if (claim.length > 500) {
    errors.push("核心观点不能超过500个字符");
  }

  if (confidence < 0 || confidence > 1) {
    errors.push("置信度必须在0-1之间");
  }

  return errors;
}

/**
 * 判断是否可以申请下场发言
 * 只在第3-6轮允许观众申请
 */
export function canRequestToSpeak(sequence: number): boolean {
  return sequence >= 3 && sequence <= 6;
}
