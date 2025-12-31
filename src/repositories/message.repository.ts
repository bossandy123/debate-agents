import Database from 'better-sqlite3';
import { Message, MessageType } from '../types/index.js';
import { logger } from '../utils/logger.js';
import DatabaseConnection from '../db/connection.js';

/**
 * MessageRepository类
 * 处理消息相关的数据库操作
 */
export class MessageRepository {
  private db: Database.Database;

  constructor() {
    this.db = DatabaseConnection.getConnection();
  }

  /**
   * 创建新消息
   */
  create(message: Omit<Message, 'id'>): Message {
    const stmt = this.db.prepare(`
      INSERT INTO messages (round_id, agent_id, content, message_type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      message.round_id,
      message.agent_id,
      message.content,
      message.message_type,
      message.created_at
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * 根据ID查找消息
   */
  findById(id: number): Message | null {
    const stmt = this.db.prepare('SELECT * FROM messages WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapToMessage(row) : null;
  }

  /**
   * 获取指定回合的所有消息
   */
  findByRoundId(roundId: number): Message[] {
    const stmt = this.db.prepare('SELECT * FROM messages WHERE round_id = ? ORDER BY created_at ASC');
    const rows = stmt.all(roundId) as any[];
    return rows.map(row => this.mapToMessage(row));
  }

  /**
   * 获取指定Agent在指定回合的消息
   */
  findByRoundAndAgent(roundId: number, agentId: string): Message[] {
    const stmt = this.db.prepare(
      'SELECT * FROM messages WHERE round_id = ? AND agent_id = ? ORDER BY created_at ASC'
    );
    const rows = stmt.all(roundId, agentId) as any[];
    return rows.map(row => this.mapToMessage(row));
  }

  /**
   * 批量创建消息
   */
  createBatch(messages: Omit<Message, 'id'>[]): Message[] {
    const stmt = this.db.prepare(`
      INSERT INTO messages (round_id, agent_id, content, message_type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const createdMessages: Message[] = [];

    this.db.exec('BEGIN TRANSACTION');

    try {
      for (const message of messages) {
        const result = stmt.run(
          message.round_id,
          message.agent_id,
          message.content,
          message.message_type,
          message.created_at
        );
        createdMessages.push({
          id: result.lastInsertRowid as number,
          ...message,
        });
      }
      this.db.exec('COMMIT');
      logger.info(`批量创建 ${messages.length} 条消息`);
    } catch (error) {
      this.db.exec('ROLLBACK');
      logger.error('批量创建消息失败', { error: (error as Error).message });
      throw error;
    }

    return createdMessages;
  }

  /**
   * 删除指定回合的所有消息
   */
  deleteByRoundId(roundId: number): number {
    const stmt = this.db.prepare('DELETE FROM messages WHERE round_id = ?');
    const result = stmt.run(roundId);
    logger.info(`删除回合 ${roundId} 的 ${result.changes} 条消息`);
    return result.changes;
  }

  /**
   * 将数据库行映射为Message对象
   */
  private mapToMessage(row: any): Message {
    return {
      id: row.id,
      round_id: row.round_id,
      agent_id: row.agent_id,
      content: row.content,
      message_type: row.message_type as MessageType,
      created_at: row.created_at,
    };
  }
}

export default MessageRepository;
