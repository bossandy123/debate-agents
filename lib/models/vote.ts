/**
 * Vote 数据模型和类型定义
 * 代表观众 Agent 在辩论结束后的投票
 */

/**
 * 投票立场
 */
export type VoteStance = "pro" | "con" | "draw";

/**
 * Vote 实体
 */
export interface Vote {
  agent_id: string;
  debate_id: number;
  vote: VoteStance;
  confidence: number; // 0-1
  reason?: string;
}

/**
 * 创建投票输入
 */
export interface CreateVoteInput {
  agent_id: string;
  debate_id: number;
  vote: VoteStance;
  confidence: number;
  reason?: string;
}

/**
 * 投票统计
 */
export interface VoteStats {
  pro: number;
  con: number;
  draw: number;
  total: number;
  pro_weighted: number; // 加上置信度后的支持度
  con_weighted: number;
}

/**
 * 带观众信息的投票
 */
export interface VoteWithAgent extends Vote {
  agent: {
    id: string;
    audience_type: string;
    model_name: string;
  };
}

/**
 * 验证投票输入
 */
export function validateVote(
  vote: VoteStance,
  confidence: number
): string[] {
  const errors: string[] = [];

  if (vote !== "pro" && vote !== "con" && vote !== "draw") {
    errors.push("投票立场必须是 pro、con 或 draw");
  }

  if (confidence < 0 || confidence > 1) {
    errors.push("置信度必须在0-1之间");
  }

  return errors;
}

/**
 * 汇总投票统计
 */
export function aggregateVotes(votes: Vote[]): VoteStats {
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
 * 根据投票统计判断胜方
 */
export function determineWinnerFromVotes(stats: VoteStats): VoteStance {
  if (stats.pro_weighted > stats.con_weighted) {
    return "pro";
  } else if (stats.con_weighted > stats.pro_weighted) {
    return "con";
  }
  return "draw";
}
