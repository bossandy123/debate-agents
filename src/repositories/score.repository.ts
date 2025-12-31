import Database from 'better-sqlite3';
import { Score } from '../types/index.js';
import { logger } from '../utils/logger.js';
import DatabaseConnection from '../db/connection.js';

/**
 * ScoreRepository类
 * 处理评分相关的数据库操作
 */
export class ScoreRepository {
  private db: Database.Database;

  constructor() {
    this.db = DatabaseConnection.getConnection();
  }

  /**
   * 创建新评分
   */
  create(score: Omit<Score, 'id'>): Score {
    const stmt = this.db.prepare(`
      INSERT INTO scores (round_id, agent_id, logic, rebuttal, clarity, evidence, total, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      score.round_id,
      score.agent_id,
      score.logic,
      score.rebuttal,
      score.clarity,
      score.evidence,
      score.total,
      score.comment ?? null
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * 根据ID查找评分
   */
  findById(id: number): Score | null {
    const stmt = this.db.prepare('SELECT * FROM scores WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapToScore(row) : null;
  }

  /**
   * 获取指定回合的所有评分
   */
  findByRoundId(roundId: number): Score[] {
    const stmt = this.db.prepare('SELECT * FROM scores WHERE round_id = ? ORDER BY total DESC');
    const rows = stmt.all(roundId) as any[];
    return rows.map(row => this.mapToScore(row));
  }

  /**
   * 获取指定Agent在指定回合的评分
   */
  findByRoundAndAgent(roundId: number, agentId: string): Score | null {
    const stmt = this.db.prepare(
      'SELECT * FROM scores WHERE round_id = ? AND agent_id = ?'
    );
    const row = stmt.get(roundId, agentId) as any;
    return row ? this.mapToScore(row) : null;
  }

  /**
   * 获取指定Agent在指定辩论中的所有评分
   */
  findByDebateAndAgent(debateId: number, agentId: string): Score[] {
    const stmt = this.db.prepare(`
      SELECT s.* FROM scores s
      INNER JOIN rounds r ON s.round_id = r.id
      WHERE r.debate_id = ? AND s.agent_id = ?
      ORDER BY s.round_id ASC
    `);
    const rows = stmt.all(debateId, agentId) as any[];
    return rows.map(row => this.mapToScore(row));
  }

  /**
   * 计算指定Agent在指定辩论中的总分
   */
  getTotalScoreByAgent(debateId: number, agentId: number): number {
    const stmt = this.db.prepare(`
      SELECT SUM(total) as total FROM scores s
      INNER JOIN rounds r ON s.round_id = r.id
      WHERE r.debate_id = ? AND s.agent_id = ?
    `);
    const result = stmt.get(debateId, agentId) as { total: number } | undefined;
    return result?.total || 0;
  }

  /**
   * 批量创建评分
   */
  createBatch(scores: Omit<Score, 'id'>[]): Score[] {
    const stmt = this.db.prepare(`
      INSERT INTO scores (round_id, agent_id, logic, rebuttal, clarity, evidence, total, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const createdScores: Score[] = [];

    this.db.exec('BEGIN TRANSACTION');

    try {
      for (const score of scores) {
        const result = stmt.run(
          score.round_id,
          score.agent_id,
          score.logic,
          score.rebuttal,
          score.clarity,
          score.evidence,
          score.total,
          score.comment ?? null
        );
        createdScores.push({
          id: result.lastInsertRowid as number,
          ...score,
        });
      }
      this.db.exec('COMMIT');
      logger.info(`批量创建 ${scores.length} 条评分`);
    } catch (error) {
      this.db.exec('ROLLBACK');
      logger.error('批量创建评分失败', { error: (error as Error).message });
      throw error;
    }

    return createdScores;
  }

  /**
   * 将数据库行映射为Score对象
   */
  private mapToScore(row: any): Score {
    return {
      id: row.id,
      round_id: row.round_id,
      agent_id: row.agent_id,
      logic: row.logic,
      rebuttal: row.rebuttal,
      clarity: row.clarity,
      evidence: row.evidence,
      total: row.total,
      comment: row.comment ?? undefined,
    };
  }
}

export default ScoreRepository;
