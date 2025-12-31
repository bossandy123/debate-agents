/**
 * Vote Repository
 * 观众投票数据访问层
 */

import { getDb } from "@/lib/db/client";
import type { Vote, CreateVoteInput, VoteStats } from "@/lib/models/vote";

export class VoteRepository {
  /**
   * 创建投票
   */
  create(input: CreateVoteInput): Vote {
    const db = getDb();

    db.prepare(
      `INSERT INTO votes (agent_id, debate_id, vote, confidence, reason)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      input.agent_id,
      input.debate_id,
      input.vote,
      input.confidence,
      input.reason ?? null
    );

    return this.findByAgentIdAndDebateId(input.agent_id, input.debate_id)!;
  }

  /**
   * 根据 Agent 和辩论查找投票
   */
  findByAgentIdAndDebateId(agentId: string, debateId: number): Vote | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM votes WHERE agent_id = ? AND debate_id = ?")
      .get(agentId, debateId) as Vote | undefined;

    return row ?? null;
  }

  /**
   * 获取辩论的所有投票
   */
  findByDebateId(debateId: number): Vote[] {
    const db = getDb();
    return db
      .prepare("SELECT * FROM votes WHERE debate_id = ?")
      .all(debateId) as Vote[];
  }

  /**
   * 获取辩论的投票统计
   */
  getStatsByDebateId(debateId: number): VoteStats {
    const votes = this.findByDebateId(debateId);

    const stats: VoteStats = {
      pro: 0,
      con: 0,
      draw: 0,
      total: votes.length,
      pro_weighted: 0,
      con_weighted: 0,
    };

    for (const vote of votes) {
      switch (vote.vote) {
        case "pro":
          stats.pro++;
          stats.pro_weighted += vote.confidence;
          break;
        case "con":
          stats.con++;
          stats.con_weighted += vote.confidence;
          break;
        case "draw":
          stats.draw++;
          break;
      }
    }

    return stats;
  }

  /**
   * 批量创建投票
   */
  createBatch(inputs: CreateVoteInput[]): Vote[] {
    const db = getDb();
    const transaction = db.transaction(() => {
      return inputs.map((input) => this.create(input));
    });
    return transaction();
  }

  /**
   * 删除辩论的所有投票
   */
  deleteByDebateId(debateId: number): number {
    const db = getDb();
    const result = db.prepare("DELETE FROM votes WHERE debate_id = ?").run(debateId);
    return result.changes;
  }

  /**
   * 检查 Agent 是否已投票
   */
  hasVoted(agentId: string, debateId: number): boolean {
    const db = getDb();
    const row = db
      .prepare("SELECT 1 FROM votes WHERE agent_id = ? AND debate_id = ? LIMIT 1")
      .get(agentId, debateId);
    return row !== undefined;
  }
}

// 导出单例
export const voteRepository = new VoteRepository();
