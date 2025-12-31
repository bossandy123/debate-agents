/**
 * Debate Repository
 * 辩论会话数据访问层
 */

import { getDb } from "@/lib/db/client";
import type { Debate, CreateDebateInput, UpdateDebateInput, DebateListItem, Winner, DebateStatus } from "@/lib/models/debate";

export class DebateRepository {
  /**
   * 创建辩论
   */
  create(input: CreateDebateInput): Debate {
    const db = getDb();

    const result = db
      .prepare(
        `INSERT INTO debates (topic, pro_definition, con_definition, max_rounds, judge_weight, audience_weight)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.topic,
        input.pro_definition ?? null,
        input.con_definition ?? null,
        input.max_rounds ?? 10,
        input.judge_weight ?? 0.5,
        input.audience_weight ?? 0.5
      );

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * 根据 ID 查找辩论
   */
  findById(id: number): Debate | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM debates WHERE id = ?")
      .get(id) as Debate | undefined;

    return row ?? null;
  }

  /**
   * 获取所有辩论列表
   */
  findAll(options?: {
    status?: DebateStatus;
    limit?: number;
    offset?: number;
  }): DebateListItem[] {
    const db = getDb();

    let query = "SELECT id, topic, status, winner, created_at, started_at, completed_at FROM debates";
    const params: unknown[] = [];

    if (options?.status) {
      query += " WHERE status = ?";
      params.push(options.status);
    }

    query += " ORDER BY created_at DESC";

    if (options?.limit) {
      query += " LIMIT ?";
      params.push(options.limit);
    }

    if (options?.offset) {
      query += " OFFSET ?";
      params.push(options.offset);
    }

    return db.prepare(query).all(...params) as DebateListItem[];
  }

  /**
   * 统计辩论数量
   */
  count(options?: { status?: DebateStatus }): number {
    const db = getDb();

    let query = "SELECT COUNT(*) as count FROM debates";
    const params: unknown[] = [];

    if (options?.status) {
      query += " WHERE status = ?";
      params.push(options.status);
    }

    const result = db.prepare(query).get(...params) as { count: number };
    return result.count;
  }

  /**
   * 更新辩论
   */
  update(id: number, input: UpdateDebateInput): Debate | null {
    const db = getDb();

    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.topic !== undefined) {
      updates.push("topic = ?");
      params.push(input.topic);
    }
    if (input.pro_definition !== undefined) {
      updates.push("pro_definition = ?");
      params.push(input.pro_definition);
    }
    if (input.con_definition !== undefined) {
      updates.push("con_definition = ?");
      params.push(input.con_definition);
    }
    if (input.max_rounds !== undefined) {
      updates.push("max_rounds = ?");
      params.push(input.max_rounds);
    }
    if (input.judge_weight !== undefined) {
      updates.push("judge_weight = ?");
      params.push(input.judge_weight);
    }
    if (input.audience_weight !== undefined) {
      updates.push("audience_weight = ?");
      params.push(input.audience_weight);
    }
    if (input.status !== undefined) {
      updates.push("status = ?");
      params.push(input.status);
    }
    if (input.winner !== undefined) {
      updates.push("winner = ?");
      params.push(input.winner);
    }
    if (input.started_at !== undefined) {
      updates.push("started_at = ?");
      params.push(input.started_at);
    }
    if (input.completed_at !== undefined) {
      updates.push("completed_at = ?");
      params.push(input.completed_at);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    params.push(id);

    db.prepare(`UPDATE debates SET ${updates.join(", ")} WHERE id = ?`).run(
      ...params
    );

    return this.findById(id);
  }

  /**
   * 删除辩论
   */
  delete(id: number): boolean {
    const db = getDb();
    const result = db.prepare("DELETE FROM debates WHERE id = ?").run(id);
    return result.changes > 0;
  }

  /**
   * 更新辩论状态
   */
  updateStatus(id: number, status: DebateStatus): Debate | null {
    return this.update(id, { status });
  }

  /**
   * 设置辩论开始
   */
  setStarted(id: number): Debate | null {
    return this.update(id, {
      status: "running",
      started_at: new Date().toISOString(),
    });
  }

  /**
   * 设置辩论完成
   */
  setCompleted(id: number, winner?: Winner): Debate | null {
    return this.update(id, {
      status: "completed",
      winner,
      completed_at: new Date().toISOString(),
    });
  }

  /**
   * 设置辩论失败
   */
  setFailed(id: number): Debate | null {
    return this.update(id, {
      status: "failed",
      completed_at: new Date().toISOString(),
    });
  }
}

// 导出单例
export const debateRepository = new DebateRepository();
