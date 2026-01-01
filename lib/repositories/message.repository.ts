/**
 * Message Repository
 * 发言记录数据访问层
 */

import { getDb } from "@/lib/db/client";
import type { Message, CreateMessageInput, MessageWithAgent } from "@/lib/models/message";

export class MessageRepository {
  /**
   * 创建消息
   */
  create(input: CreateMessageInput): Message {
    const db = getDb();

    const result = db
      .prepare(
        `INSERT INTO messages (round_id, agent_id, content, token_count)
         VALUES (?, ?, ?, ?)`
      )
      .run(
        input.round_id,
        input.agent_id,
        input.content,
        input.token_count ?? null
      );

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * 根据 ID 查找消息
   */
  findById(id: number): Message | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM messages WHERE id = ?")
      .get(id) as Message | undefined;

    return row ?? null;
  }

  /**
   * 获取轮次的所有消息
   */
  findByRoundId(roundId: number): Message[] {
    const db = getDb();
    return db
      .prepare("SELECT * FROM messages WHERE round_id = ? ORDER BY created_at")
      .all(roundId) as Message[];
  }

  /**
   * 获取轮次的所有消息（带 Agent 信息）
   */
  findByRoundIdWithAgent(roundId: number): MessageWithAgent[] {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT m.*, a.id as agent_id, a.role, a.stance, a.model_name
         FROM messages m
         JOIN agents a ON m.agent_id = a.id
         WHERE m.round_id = ?
         ORDER BY m.created_at`
      )
      .all(roundId) as Array<Message & { agent_id: string; role: string; stance?: string; model_name: string }>;

    return rows.map((row) => ({
      id: row.id,
      round_id: row.round_id,
      agent_id: row.agent_id,
      content: row.content,
      token_count: row.token_count,
      created_at: row.created_at,
      agent: {
        id: row.agent_id,
        role: row.role,
        stance: row.stance,
        model_name: row.model_name,
      },
    }));
  }

  /**
   * 获取 Agent 在轮次中的消息
   */
  findByRoundIdAndAgentId(roundId: number, agentId: string): Message | null {
    const db = getDb();
    const row = db
      .prepare(
        "SELECT * FROM messages WHERE round_id = ? AND agent_id = ?"
      )
      .get(roundId, agentId) as Message | undefined;

    return row ?? null;
  }

  /**
   * 获取辩论的所有消息（通过轮次）
   */
  findByDebateId(debateId: number): Message[] {
    const db = getDb();
    return db
      .prepare(
        `SELECT m.* FROM messages m
         JOIN rounds r ON m.round_id = r.id
         WHERE r.debate_id = ?
         ORDER BY m.created_at`
      )
      .all(debateId) as Message[];
  }

  /**
   * 获取辩论的完整历史记录（格式化输出）
   */
  getDebateHistory(debateId: number): string {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT m.content, a.stance, a.role
         FROM messages m
         JOIN agents a ON m.agent_id = a.id
         JOIN rounds r ON m.round_id = r.id
         WHERE r.debate_id = ?
         ORDER BY m.created_at`
      )
      .all(debateId) as { content: string; stance?: string; role: string }[];

    return rows
      .map((row) => {
        const prefix = row.role === "debater" ? row.stance?.toUpperCase() : row.role;
        return `[${prefix}]: ${row.content}`;
      })
      .join("\n\n");
  }

  /**
   * 批量创建消息
   */
  createBatch(inputs: CreateMessageInput[]): Message[] {
    const db = getDb();
    const transaction = db.transaction(() => {
      return inputs.map((input) => this.create(input));
    });
    return transaction();
  }

  /**
   * 删除轮次的所有消息
   */
  deleteByRoundId(roundId: number): number {
    const db = getDb();
    const result = db.prepare("DELETE FROM messages WHERE round_id = ?").run(roundId);
    return result.changes;
  }

  /**
   * 删除辩论的所有消息（通过子查询删除）
   */
  deleteByDebateId(debateId: number): number {
    const db = getDb();
    const result = db
      .prepare(`DELETE FROM messages WHERE round_id IN (SELECT id FROM rounds WHERE debate_id = ?)`)
      .run(debateId);
    return result.changes;
  }

  /**
   * 统计轮次的消息数量
   */
  countByRoundId(roundId: number): number {
    const db = getDb();
    const result = db
      .prepare("SELECT COUNT(*) as count FROM messages WHERE round_id = ?")
      .get(roundId) as { count: number };
    return result.count;
  }

  /**
   * 统计辩论的总消息数量
   */
  countByDebateId(debateId: number): number {
    const db = getDb();
    const result = db
      .prepare(
        `SELECT COUNT(*) as count FROM messages m
         JOIN rounds r ON m.round_id = r.id
         WHERE r.debate_id = ?`
      )
      .get(debateId) as { count: number };
    return result.count;
  }

  /**
   * 获取辩论的轮次列表（用于投票服务）
   */
  getRoundsByDebateId(debateId: number): Array<{ id: number; sequence: number }> {
    const db = getDb();
    return db
      .prepare(
        `SELECT id, sequence FROM rounds
         WHERE debate_id = ?
         ORDER BY sequence`
      )
      .all(debateId) as Array<{ id: number; sequence: number }>;
  }
}

// 导出单例
export const messageRepository = new MessageRepository();
