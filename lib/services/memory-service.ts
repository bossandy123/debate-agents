/**
 * Memory Service
 * Manages conversation history and context for debate agents
 */

import { messageRepository } from "@/lib/repositories/message.repository";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";

/**
 * 对话历史条目
 */
export interface ConversationEntry {
  role: string;
  stance?: string;
  content: string;
}

/**
 * 轮次上下文
 */
export interface RoundContext {
  roundNumber: number;
  phase: "opening" | "rebuttal" | "closing";
  messages: ConversationEntry[];
  proScore?: number;
  conScore?: number;
}

/**
 * 记忆服务
 * 管理辩论的对话历史和上下文
 */
class MemoryService {
  /**
   * 缓存辩论上下文（避免频繁查询数据库）
   */
  private contextCache = new Map<number, RoundContext[]>();

  /**
   * 获取对话历史（用于格式化成 Prompt）
   */
  async getConversationHistory(
    debateId: number,
    _upToRound?: number
  ): Promise<ConversationEntry[]> {
    const messages = await messageRepository.findByDebateId(debateId);

    const history: ConversationEntry[] = [];

    for (const message of messages) {
      // 需要通过 agent 信息获取 role 和 stance
      // 这里暂时简化处理，实际使用时可以扩展
      history.push({
        role: "agent", // 可以从 agent 表查询
        content: message.content,
      });
    }

    return history;
  }

  /**
   * 添加消息到记忆
   */
  async addMessage(
    roundId: number,
    agentId: string,
    content: string
  ): Promise<void> {
    // 保存到数据库
    await messageRepository.create({
      round_id: roundId,
      agent_id: agentId,
      content,
    });

    // 清除缓存
    this.clearCache();
  }

  /**
   * 获取最近的消息
   */
  async getRecentMessages(debateId: number, count: number = 5): Promise<ConversationEntry[]> {
    const history = await this.getConversationHistory(debateId);
    return history.slice(-count);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.contextCache.clear();
  }

  /**
   * 将对话历史转换为 LangChain BaseMessage 格式
   */
  toLangChainMessages(history: ConversationEntry[]): Array<BaseMessage> {
    return history.map((entry) => {
      const content = entry.stance
        ? `[${entry.stance.toUpperCase()}] ${entry.content}`
        : entry.content;

      switch (entry.role) {
        case "human":
        case "user":
          return new HumanMessage(content);
        case "ai":
        case "assistant":
        case "agent":
          return new AIMessage(content);
        case "system":
          return new SystemMessage(content);
        default:
          return new HumanMessage(content);
      }
    });
  }

  /**
   * 格式化对话历史为文本（用于 Prompt）
   */
  formatConversationHistory(history: ConversationEntry[]): string {
    return history
      .map((entry) => {
        const roleLabel = entry.stance ?? this.translateRole(entry.role);
        return `**${roleLabel}：**\n${entry.content}`;
      })
      .join("\n\n");
  }

  /**
   * 翻译角色名称为中文
   */
  private translateRole(role: string): string {
    const roleMap: Record<string, string> = {
      pro: "正方",
      con: "反方",
      judge: "裁判",
      audience: "观众",
      system: "系统",
      debater: "辩手",
      agent: "代理",
    };
    return roleMap[role] || role;
  }

  /**
   * 格式化双方论点摘要
   */
  formatArgumentsSummary(history: ConversationEntry[]): {
    pro: string;
    con: string;
  } {
    const proMessages = history
      .filter((m) => m.stance === "pro" || m.role === "pro")
      .map((m) => m.content)
      .join("\n\n");

    const conMessages = history
      .filter((m) => m.stance === "con" || m.role === "con")
      .map((m) => m.content)
      .join("\n\n");

    return {
      pro: proMessages || "（正方暂无发言）",
      con: conMessages || "（反方暂无发言）",
    };
  }

  /**
   * 根据轮次确定辩论阶段
   */
  getPhase(roundNumber: number, maxRounds: number): "opening" | "rebuttal" | "closing" {
    if (roundNumber <= 2) {
      return "opening";
    }
    if (roundNumber >= maxRounds) {
      return "closing";
    }
    return "rebuttal";
  }
}

// 导出单例
export const memoryService = new MemoryService();
export default memoryService;
