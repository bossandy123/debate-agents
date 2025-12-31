/**
 * Round Repository
 * 辩论轮次数据访问层
 */

import { getDb } from "@/lib/db/client";
import type { Round, Phase, RoundType } from "@/lib/models/round";

export class RoundRepository {
  /**
   * 创建轮次
   */
  create(input: {
    debate_id: number;
    sequence: number;
    phase: Phase;
    type: RoundType;
  }): Round {
    const db = getDb();

    const result = db
      .prepare(
        `INSERT INTO rounds (debate_id, sequence, phase, type, started_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      )
      .run(input.debate_id, input.sequence, input.phase, input.type);

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * 根据 ID 查找轮次
   */
  findById(id: number): Round | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM rounds WHERE id = ?")
      .get(id) as Round | undefined;

    return row ?? null;
  }

  /**
   * 获取辩论的所有轮次
   */
  findByDebateId(debateId: number): Round[] {
    const db = getDb();
    return db
      .prepare("SELECT * FROM rounds WHERE debate_id = ? ORDER BY sequence")
      .all(debateId) as Round[];
  }

  /**
   * 根据轮次序号查找
   */
  findByDebateIdAndSequence(debateId: number, sequence: number): Round | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM rounds WHERE debate_id = ? AND sequence = ?")
      .get(debateId, sequence) as Round | undefined;

    return row ?? null;
  }

  /**
   * 获取当前轮次（最新开始的轮次）
   */
  findCurrentRoundByDebateId(debateId: number): Round | null {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT * FROM rounds
         WHERE debate_id = ? AND completed_at IS NULL
         ORDER BY sequence DESC
         LIMIT 1`
      )
      .get(debateId) as Round | undefined;

    return row ?? null;
  }

  /**
   * 获取最新完成的轮次
   */
  findLatestCompletedRoundByDebateId(debateId: number): Round | null {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT * FROM rounds
         WHERE debate_id = ? AND completed_at IS NOT NULL
         ORDER BY sequence DESC
         LIMIT 1`
      )
      .get(debateId) as Round | undefined;

    return row ?? null;
  }

  /**
   * 更新轮次完成时间
   */
  markCompleted(id: number): Round | null {
    const db = getDb();
    db.prepare("UPDATE rounds SET completed_at = datetime('now') WHERE id = ?").run(
      id
    );
    return this.findById(id);
  }

  /**
   * 批量创建轮次
   */
  createBatch(inputs: Array<{
    debate_id: number;
    sequence: number;
    phase: Phase;
    type: RoundType;
  }>): Round[] {
    const db = getDb();
    const transaction = db.transaction(() => {
      return inputs.map((input) => this.create(input));
    });
    return transaction();
  }

  /**
   * 删除辩论的所有轮次
   */
  deleteByDebateId(debateId: number): number {
    const db = getDb();
    const result = db.prepare("DELETE FROM rounds WHERE debate_id = ?").run(debateId);
    return result.changes;
  }

  /**
   * 统计辩论的轮次数量
   */
  countByDebateId(debateId: number): number {
    const db = getDb();
    const result = db
      .prepare("SELECT COUNT(*) as count FROM rounds WHERE debate_id = ?")
      .get(debateId) as { count: number };
    return result.count;
  }

  /**
   * 统计已完成轮次数量
   */
  countCompletedByDebateId(debateId: number): number {
    const db = getDb();
    const result = db
      .prepare(
        `SELECT COUNT(*) as count FROM rounds
         WHERE debate_id = ? AND completed_at IS NOT NULL`
      )
      .get(debateId) as { count: number };
    return result.count;
  }
}

// 导出单例
export const roundRepository = new RoundRepository();
