import Database from 'better-sqlite3';
import { Debate, DebateStatus } from '../types/index.js';
import { logger } from '../utils/logger.js';
import DatabaseConnection from '../db/connection.js';

/**
 * 辩论Repository类
 * 处理辩论相关的数据库操作
 */
export class DebateRepository {
  private db: Database.Database;

  constructor() {
    this.db = DatabaseConnection.getConnection();
  }

  /**
   * 创建新辩论
   */
  create(debate: Omit<Debate, 'id'>): Debate {
    const stmt = this.db.prepare(`
      INSERT INTO debates (topic, status, created_at, completed_at, winner, error_message)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      debate.topic,
      debate.status,
      debate.created_at,
      debate.completed_at ?? null,
      debate.winner ?? null,
      debate.error_message ?? null
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * 根据ID查找辩论
   */
  findById(id: number): Debate | null {
    const stmt = this.db.prepare('SELECT * FROM debates WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapToDebate(row) : null;
  }

  /**
   * 更新辩论状态
   */
  updateStatus(id: number, status: DebateStatus, completedAt?: string): void {
    const stmt = this.db.prepare(
      'UPDATE debates SET status = ?, completed_at = ? WHERE id = ?'
    );
    stmt.run(status, completedAt ?? null, id);
    logger.info(`辩论 ${id} 状态更新为 ${status}`);
  }

  /**
   * 设置辩论胜者
   */
  setWinner(id: number, winner: 'pro' | 'con' | 'draw'): void {
    const stmt = this.db.prepare('UPDATE debates SET winner = ? WHERE id = ?');
    stmt.run(winner, id);
    logger.info(`辩论 ${id} 胜者设置为 ${winner}`);
  }

  /**
   * 设置错误消息
   */
  setError(id: number, errorMessage: string): void {
    const stmt = this.db.prepare('UPDATE debates SET status = ?, error_message = ? WHERE id = ?');
    stmt.run(DebateStatus.FAILED, errorMessage, id);
    logger.error(`辩论 ${id} 失败: ${errorMessage}`);
  }

  /**
   * 获取所有辩论
   */
  findAll(options?: { status?: DebateStatus; limit?: number; offset?: number }): Debate[] {
    let sql = 'SELECT * FROM debates';
    const params: unknown[] = [];

    if (options?.status) {
      sql += ' WHERE status = ?';
      params.push(options.status);
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options?.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map(row => this.mapToDebate(row));
  }

  /**
   * 统计辩论数量
   */
  count(options?: { status?: DebateStatus }): number {
    let sql = 'SELECT COUNT(*) as count FROM debates';
    const params: unknown[] = [];

    if (options?.status) {
      sql += ' WHERE status = ?';
      params.push(options.status);
    }

    const stmt = this.db.prepare(sql);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  /**
   * 将数据库行映射为Debate对象
   */
  private mapToDebate(row: any): Debate {
    return {
      id: row.id,
      topic: row.topic,
      status: row.status as DebateStatus,
      created_at: row.created_at,
      completed_at: row.completed_at ?? undefined,
      winner: row.winner ?? undefined,
      error_message: row.error_message ?? undefined,
    };
  }
}

export default DebateRepository;
