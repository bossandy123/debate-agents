/**
 * Agent 数据模型和类型定义
 * 代表参与辩论的 AI 角色
 */

/**
 * Agent 角色
 */
export type AgentRole = "debater" | "judge" | "audience" | "moderator";

/**
 * Agent 立场（仅 debater 需要）
 */
export type Stance = "pro" | "con";

/**
 * 模型提供商
 */
export type ModelProvider = "openai" | "anthropic" | "google" | "deepseek";

/**
 * 辩手风格标签（仅 debater 可选）
 */
export type StyleTag = "rational" | "aggressive" | "conservative" | "technical";

/**
 * 观众类型（仅 audience 可选）
 */
export type AudienceType =
  | "rational"
  | "pragmatic"
  | "technical"
  | "risk-averse"
  | "emotional";

/**
 * Agent 实体
 */
export interface Agent {
  id: string; // UUID
  debate_id: number;
  role: AgentRole;
  stance?: Stance;
  model_provider: ModelProvider;
  model_name: string;
  style_tag?: StyleTag;
  audience_type?: AudienceType;
  config?: Record<string, unknown>;
}

/**
 * 创建 Agent 输入
 */
export interface CreateAgentInput {
  id?: string; // 可选，如果不提供则自动生成
  debate_id: number;
  role: AgentRole;
  stance?: Stance;
  model_provider: ModelProvider;
  model_name: string;
  style_tag?: StyleTag;
  audience_type?: AudienceType;
  config?: Record<string, unknown>;
}

/**
 * Agent 配置（用于 API 请求）
 */
export interface AgentConfig {
  role: AgentRole;
  stance?: Stance;
  model_provider: ModelProvider;
  model_name: string;
  style_tag?: StyleTag;
  audience_type?: AudienceType;
}

/**
 * 验证 Agent 配置
 */
export function validateAgentInput(input: CreateAgentInput): string[] {
  const errors: string[] = [];

  if (!input.model_name || input.model_name.trim().length === 0) {
    errors.push("模型名称不能为空");
  }

  if (input.role === "debater" && !input.stance) {
    errors.push("辩手必须指定立场（pro 或 con）");
  }

  if (input.role === "debater" && input.stance !== "pro" && input.stance !== "con") {
    errors.push("辩手立场只能是 pro 或 con");
  }

  if (input.role === "debater" && !input.style_tag) {
    // style_tag 是可选的，不需要验证
  }

  if (input.role === "audience" && !input.audience_type) {
    errors.push("观众必须指定类型");
  }

  const validProviders: ModelProvider[] = [
    "openai",
    "anthropic",
    "google",
    "deepseek",
  ];
  if (!validProviders.includes(input.model_provider)) {
    errors.push(`无效的模型提供商: ${input.model_provider}`);
  }

  return errors;
}

/**
 * 生成随机 Agent ID（UUID v4 格式）
 */
export function generateAgentId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
