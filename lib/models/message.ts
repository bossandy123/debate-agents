/**
 * Message 数据模型和类型定义
 * 代表某个 Agent 在某一轮中的发言内容
 */

/**
 * Message 实体
 */
export interface Message {
  id: number;
  round_id: number;
  agent_id: string;
  content: string;
  token_count?: number;
  created_at: string;
}

/**
 * 创建消息输入
 */
export interface CreateMessageInput {
  round_id: number;
  agent_id: string;
  content: string;
  token_count?: number;
}

/**
 * 带有 Agent 信息的 Message
 */
export interface MessageWithAgent extends Message {
  agent: {
    id: string;
    role: string;
    stance?: string;
    model_name: string;
  };
}

/**
 * 估算 Token 数量（简单估算：字符数 / 4）
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * 验证消息内容
 */
export function validateMessage(content: string): string[] {
  const errors: string[] = [];

  if (!content || content.trim().length === 0) {
    errors.push("发言内容不能为空");
  }

  if (content.length > 10000) {
    errors.push("发言内容不能超过10000个字符");
  }

  return errors;
}
