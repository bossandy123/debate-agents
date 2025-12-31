/**
 * Debate 数据模型和类型定义
 * 代表一次完整的辩论活动
 */

/**
 * 辩论状态
 */
export type DebateStatus = "pending" | "running" | "completed" | "failed";

/**
 * 胜方
 */
export type Winner = "pro" | "con" | "draw";

/**
 * Debate 实体
 */
export interface Debate {
  id: number;
  topic: string;
  pro_definition?: string;
  con_definition?: string;
  max_rounds: number;
  judge_weight: number;
  audience_weight: number;
  status: DebateStatus;
  winner?: Winner;
  created_at: string; // ISO 8601
  started_at?: string;
  completed_at?: string;
}

/**
 * 创建辩论输入
 */
export interface CreateDebateInput {
  topic: string;
  pro_definition?: string;
  con_definition?: string;
  max_rounds?: number;
  judge_weight?: number;
  audience_weight?: number;
}

/**
 * 更新辩论输入
 */
export interface UpdateDebateInput {
  topic?: string;
  pro_definition?: string;
  con_definition?: string;
  max_rounds?: number;
  judge_weight?: number;
  audience_weight?: number;
  status?: DebateStatus;
  winner?: Winner;
  started_at?: string;
  completed_at?: string;
}

/**
 * 辩论列表项（不含详细信息）
 */
export interface DebateListItem {
  id: number;
  topic: string;
  status: DebateStatus;
  winner?: Winner;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

/**
 * 验证辩论配置
 */
export function validateDebateInput(input: CreateDebateInput): string[] {
  const errors: string[] = [];

  if (!input.topic || input.topic.trim().length === 0) {
    errors.push("辩题不能为空");
  }

  if (input.topic && input.topic.length > 500) {
    errors.push("辩题长度不能超过500个字符");
  }

  if (input.max_rounds !== undefined) {
    if (input.max_rounds < 1 || input.max_rounds > 20) {
      errors.push("轮数必须在1-20之间");
    }
  }

  if (
    input.judge_weight !== undefined &&
    input.audience_weight !== undefined
  ) {
    if (
      Math.abs(input.judge_weight + input.audience_weight - 1.0) > 0.01
    ) {
      errors.push("裁判权重和观众权重之和必须等于1.0");
    }
  }

  return errors;
}
