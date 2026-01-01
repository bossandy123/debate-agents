/**
 * AudienceRequest Repository
 * 观众申请发言数据访问层
 */

import { getDb } from "@/lib/db/client";
import type { AudienceRequest, CreateAudienceRequestInput } from "@/lib/models/audience-request";

export class AudienceRequestRepository {
  /**
   * 创建观众申请
   */
  create(input: CreateAudienceRequestInput): AudienceRequest {
    const db = getDb();

    const result = db
      .prepare(
        `INSERT INTO audience_requests (round_id, agent_id, intent, claim, novelty, confidence, approved)
         VALUES (?, ?, ?, ?, ?, ?, 0)`
      )
      .run(
        input.round_id,
        input.agent_id,
        input.intent,
        input.claim,
        input.novelty,
        input.confidence
      );

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * 根据 ID 查找申请
   */
  findById(id: number): AudienceRequest | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM audience_requests WHERE id = ?")
      .get(id) as AudienceRequest | undefined;

    return row ?? null;
  }

  /**
   * 获取轮次的所有申请
   */
  findByRoundId(roundId: number): AudienceRequest[] {
    const db = getDb();
    return db
      .prepare("SELECT * FROM audience_requests WHERE round_id = ?")
      .all(roundId) as AudienceRequest[];
  }

  /**
   * 获取轮次的已批准申请
   */
  findApprovedByRoundId(roundId: number): AudienceRequest[] {
    const db = getDb();
    return db
      .prepare("SELECT * FROM audience_requests WHERE round_id = ? AND approved = 1")
      .all(roundId) as AudienceRequest[];
  }

  /**
   * 获取 Agent 在轮次的申请
   */
  findByRoundIdAndAgentId(roundId: number, agentId: string): AudienceRequest | null {
    const db = getDb();
    const row = db
      .prepare(
        "SELECT * FROM audience_requests WHERE round_id = ? AND agent_id = ?"
      )
      .get(roundId, agentId) as AudienceRequest | undefined;

    return row ?? null;
  }

  /**
   * 批准申请
   */
  approve(id: number, judgeComment?: string): AudienceRequest | null {
    const db = getDb();
    db.prepare("UPDATE audience_requests SET approved = 1, judge_comment = ? WHERE id = ?").run(
      judgeComment ?? null,
      id
    );
    return this.findById(id);
  }

  /**
   * 拒绝申请
   */
  reject(id: number, judgeComment?: string): AudienceRequest | null {
    const db = getDb();
    db.prepare("UPDATE audience_requests SET approved = 0, judge_comment = ? WHERE id = ?").run(
      judgeComment ?? null,
      id
    );
    return this.findById(id);
  }

  /**
   * 批量创建申请
   */
  createBatch(inputs: CreateAudienceRequestInput[]): AudienceRequest[] {
    const db = getDb();
    const transaction = db.transaction(() => {
      return inputs.map((input) => this.create(input));
    });
    return transaction();
  }

  /**
   * 删除轮次的所有申请
   */
  deleteByRoundId(roundId: number): number {
    const db = getDb();
    const result = db.prepare("DELETE FROM audience_requests WHERE round_id = ?").run(roundId);
    return result.changes;
  }

  /**
   * 删除辩论的所有申请（通过子查询删除）
   */
  deleteByDebateId(debateId: number): number {
    const db = getDb();
    const result = db
      .prepare(`DELETE FROM audience_requests WHERE round_id IN (SELECT id FROM rounds WHERE debate_id = ?)`)
      .run(debateId);
    return result.changes;
  }

  /**
   * 统计轮次的申请数量
   */
  countByRoundId(roundId: number): number {
    const db = getDb();
    const result = db
      .prepare("SELECT COUNT(*) as count FROM audience_requests WHERE round_id = ?")
      .get(roundId) as { count: number };
    return result.count;
  }

  /**
   * 统计轮次的已批准申请数量
   */
  countApprovedByRoundId(roundId: number): number {
    const db = getDb();
    const result = db
      .prepare(
        "SELECT COUNT(*) as count FROM audience_requests WHERE round_id = ? AND approved = 1"
      )
      .get(roundId) as { count: number };
    return result.count;
  }
}

// 导出单例
export const audienceRequestRepository = new AudienceRequestRepository();
