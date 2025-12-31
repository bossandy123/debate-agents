import Database from 'better-sqlite3';
import { Round, RoundStatus } from '../types/index.js';
import { logger } from '../utils/logger.js';
import DatabaseConnection from '../db/connection.js';

/**
 * RoundRepository类
 * 处理回合相关的数据库操作
 */
export class RoundRepository {
  private db: Database.Database;

  constructor() {
    this.db = DatabaseConnection.getConnection();
  }

  /**
   * 创建新回合
   */
  create(round: Omit<Round, 'id'>): Round {
    const stmt = this.db.prepare(`
      INSERT INTO rounds (debate_id, round_num, phase, status, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      round.debate_id,
      round.round_num,
      round.phase,
      round.status,
      round.started_at ?? null,
      round.completed_at ?? null
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * 根据ID查找回合
   */
  findById(id: number): Round | null {
    const stmt = this.db.prepare('SELECT * FROM rounds WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapToRound(row) : null;
  }

  /**
   * 获取指定辩论的所有回合
   */
  findByDebateId(debateId: number): Round[] {
    const stmt = this.db.prepare(
      'SELECT * FROM rounds WHERE debate_id = ? ORDER BY round_num ASC'
    );
    const rows = stmt.all(debateId) as any[];
    return rows.map(row => this.mapToRound(row));
  }

  /**
   * 获取指定辩论指定序号的回合
   */
  findByDebateAndRoundNum(debateId: number, roundNum: number): Round | null {
    const stmt = this.db.prepare(
      'SELECT * FROM rounds WHERE debate_id = ? AND round_num = ?'
    );
    const row = stmt.get(debateId, roundNum) as any;
    return row ? this.mapToRound(row) : null;
  }

  /**
   * 更新回合状态
   */
  updateStatus(
    id: number,
    status: RoundStatus,
    startedAt?: string,
    completedAt?: string
  ): void {
    const stmt = this.db.prepare(
      'UPDATE rounds SET status = ?, started_at = ?, completed_at = ? WHERE id = ?'
    );
    stmt.run(status, startedAt ?? null, completedAt ?? null, id);
    logger.debug(`回合 ${id} 状态更新为 ${status}`);
  }

  /**
   * 批量创建回合
   */
  createBatch(rounds: Omit<Round, 'id'>[]): Round[] {
    const stmt = this.db.prepare(`
      INSERT INTO rounds (debate_id, round_num, phase, status, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const createdRounds: Round[] = [];

    this.db.exec('BEGIN TRANSACTION');

    try {
      for (const round of rounds) {
        const result = stmt.run(
          round.debate_id,
          round.round_num,
          round.phase,
          round.status,
          round.started_at ?? null,
          round.completed_at ?? null
        );
        createdRounds.push({
          id: result.lastInsertRowid as number,
          ...round,
        });
      }
      this.db.exec('COMMIT');
      logger.info(`批量创建 ${rounds.length} 个回合`);
    } catch (error) {
      this.db.exec('ROLLBACK');
      logger.error('批量创建回合失败', { error: (error as Error).message });
      throw error;
    }

    return createdRounds;
  }

  /**
   * 删除指定辩论的所有回合
   */
  deleteByDebateId(debateId: number): number {
    const stmt = this.db.prepare('DELETE FROM rounds WHERE debate_id = ?');
    const result = stmt.run(debateId);
    logger.info(`删除辩论 ${debateId} 的 ${result.changes} 个回合`);
    return result.changes;
  }

  /**
   * 将数据库行映射为Round对象
   */
  private mapToRound(row: any): Round {
    return {
      id: row.id,
      debate_id: row.debate_id,
      round_num: row.round_num,
      phase: row.phase,
      status: row.status as RoundStatus,
      started_at: row.started_at ?? undefined,
      completed_at: row.completed_at ?? undefined,
    };
  }
}

export default RoundRepository;
