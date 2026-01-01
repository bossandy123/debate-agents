/**
 * Score Repository
 * 评分记录数据访问层
 */

import { getDb } from "@/lib/db/client";
import type { Score, CreateScoreInput, ScoreSummary, PairScores } from "@/lib/models/score";

export class ScoreRepository {
  /**
   * 创建评分
   */
  create(input: CreateScoreInput): Score {
    const db = getDb();

    db.prepare(
      `INSERT INTO scores (round_id, agent_id, logic, rebuttal, clarity, evidence, comment)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .run(
        input.round_id,
        input.agent_id,
        input.logic,
        input.rebuttal,
        input.clarity,
        input.evidence,
        input.comment ?? null
      );

    return this.findByRoundIdAndAgentId(input.round_id, input.agent_id)!;
  }

  /**
   * 根据轮次和 Agent 查找评分
   */
  findByRoundIdAndAgentId(roundId: number, agentId: string): Score | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM scores WHERE round_id = ? AND agent_id = ?")
      .get(roundId, agentId) as Score | undefined;

    return row ?? null;
  }

  /**
   * 获取轮次的所有评分
   */
  findByRoundId(roundId: number): Score[] {
    const db = getDb();
    return db
      .prepare("SELECT * FROM scores WHERE round_id = ?")
      .all(roundId) as Score[];
  }

  /**
   * 获取 Agent 在辩论中的所有评分
   */
  findByAgentId(agentId: string): Score[] {
    const db = getDb();
    return db
      .prepare(
        `SELECT s.* FROM scores s
         JOIN rounds r ON s.round_id = r.id
         WHERE s.agent_id = ?
         ORDER BY r.sequence`
      )
      .all(agentId) as Score[];
  }

  /**
   * 获取轮次的双方评分对比
   */
  getPairScoresByRoundId(roundId: number): PairScores | null {
    const scores = this.findByRoundId(roundId);

    if (scores.length < 2) {
      return null;
    }

    // 假设第一个是正方，第二个是反方
    // 实际使用时需要根据 agent_id 确认
    const proScore = scores.find((s) => s.agent_id.includes("pro"));
    const conScore = scores.find((s) => s.agent_id.includes("con"));

    if (!proScore || !conScore) {
      return null;
    }

    return {
      pro: this.toSummary(proScore),
      con: this.toSummary(conScore),
    };
  }

  /**
   * 获取 Agent 在辩论中的评分汇总
   */
  getSummaryByAgentId(agentId: string, debateId: number): ScoreSummary | null {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT s.agent_id,
           SUM(s.logic) as logic,
           SUM(s.rebuttal) as rebuttal,
           SUM(s.clarity) as clarity,
           SUM(s.evidence) as evidence
         FROM scores s
         JOIN rounds r ON s.round_id = r.id
         WHERE s.agent_id = ? AND r.debate_id = ?
         GROUP BY s.agent_id`
      )
      .get(agentId, debateId) as {
        logic: number;
        rebuttal: number;
        clarity: number;
        evidence: number;
      } | undefined;

    if (!row) {
      return null;
    }

    return {
      logic: row.logic,
      rebuttal: row.rebuttal,
      clarity: row.clarity,
      evidence: row.evidence,
      total: row.logic + row.rebuttal + row.clarity + row.evidence,
    };
  }

  /**
   * 获取辩论的双方总分对比
   */
  getDebatePairSummary(debateId: number): PairScores | null {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT s.agent_id,
           SUM(s.logic) as logic,
           SUM(s.rebuttal) as rebuttal,
           SUM(s.clarity) as clarity,
           SUM(s.evidence) as evidence
         FROM scores s
         JOIN rounds r ON s.round_id = r.id
         JOIN agents a ON s.agent_id = a.id
         WHERE r.debate_id = ?
         GROUP BY s.agent_id`
      )
      .all(debateId) as Array<{ agent_id: string; logic: number; rebuttal: number; clarity: number; evidence: number }>;

    const proRow = rows.find((r) => r.agent_id.includes("pro"));
    const conRow = rows.find((r) => r.agent_id.includes("con"));

    if (!proRow || !conRow) {
      return null;
    }

    return {
      pro: {
        logic: proRow.logic,
        rebuttal: proRow.rebuttal,
        clarity: proRow.clarity,
        evidence: proRow.evidence,
        total: proRow.logic + proRow.rebuttal + proRow.clarity + proRow.evidence,
      },
      con: {
        logic: conRow.logic,
        rebuttal: conRow.rebuttal,
        clarity: conRow.clarity,
        evidence: conRow.evidence,
        total: conRow.logic + conRow.rebuttal + conRow.clarity + conRow.evidence,
      },
    };
  }

  /**
   * 转换为汇总格式
   */
  private toSummary(score: Score): ScoreSummary {
    return {
      logic: score.logic,
      rebuttal: score.rebuttal,
      clarity: score.clarity,
      evidence: score.evidence,
      total: score.logic + score.rebuttal + score.clarity + score.evidence,
    };
  }

  /**
   * 批量创建评分
   */
  createBatch(inputs: CreateScoreInput[]): Score[] {
    const db = getDb();
    const transaction = db.transaction(() => {
      return inputs.map((input) => this.create(input));
    });
    return transaction();
  }

  /**
   * 删除轮次的所有评分
   */
  deleteByRoundId(roundId: number): number {
    const db = getDb();
    const result = db.prepare("DELETE FROM scores WHERE round_id = ?").run(roundId);
    return result.changes;
  }

  /**
   * 删除辩论的所有评分（通过子查询删除）
   */
  deleteByDebateId(debateId: number): number {
    const db = getDb();
    const result = db
      .prepare(`DELETE FROM scores WHERE round_id IN (SELECT id FROM rounds WHERE debate_id = ?)`)
      .run(debateId);
    return result.changes;
  }

  /**
   * 删除 Agent 的所有评分
   */
  deleteByAgentId(agentId: string): number {
    const db = getDb();
    const result = db.prepare("DELETE FROM scores WHERE agent_id = ?").run(agentId);
    return result.changes;
  }

  /**
   * 计算辩论的总分（按立场分组）
   * 返回 Map: "pro" -> ScoreSummary, "con" -> ScoreSummary
   */
  calculateTotalScores(debateId: number): Map<string, ScoreSummary> {
    const pairSummary = this.getDebatePairSummary(debateId);

    const result = new Map<string, ScoreSummary>();

    if (pairSummary) {
      result.set("pro", pairSummary.pro);
      result.set("con", pairSummary.con);
    }

    return result;
  }
}

// 导出单例
export const scoreRepository = new ScoreRepository();
