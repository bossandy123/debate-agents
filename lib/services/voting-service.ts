/**
 * Voting Service
 * 观众投票汇总服务和分歧分析
 */

import { z } from "zod";
import { voteRepository } from "@/lib/repositories/vote.repository";
import { agentRepository } from "@/lib/repositories/agent.repository";
import { scoreRepository } from "@/lib/repositories/score.repository";
import { messageRepository } from "@/lib/repositories/message.repository";

/**
 * 观众投票结果 Schema（Zod 验证）
 */
export const AudienceVoteSchema = z.object({
  vote: z.enum(["pro", "con", "draw"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(500),
});

export type AudienceVoteInput = z.infer<typeof AudienceVoteSchema>;

/**
 * 观众投票汇总结果
 */
export interface VotingAggregation {
  pro_votes: number;
  con_votes: number;
  draw_votes: number;
  total_audience: number;
  pro_percentage: number;
  con_percentage: number;
  draw_percentage: number;
  weighted_score: {
    pro: number;
    con: number;
  };
}

/**
 * 观众分歧分析
 */
export interface PerspectiveDivergence {
  highest_divergence_round: number;
  rational_votes: {
    pro: number;
    con: number;
    draw: number;
  };
  pragmatic_votes: {
    pro: number;
    con: number;
    draw: number;
  };
  technical_votes: {
    pro: number;
    con: number;
    draw: number;
  };
  risk_averse_votes: {
    pro: number;
    con: number;
    draw: number;
  };
  emotional_votes: {
    pro: number;
    con: number;
    draw: number;
  };
  overall_divergence: number; // 0-1 scale
}

/**
 * 双方盲点分析
 */
export interface BlindSpotAnalysis {
  pro_blind_spots: string[];
  con_blind_spots: string[];
  shared_blind_spots: string[];
  missed_opportunities: string[];
}

/**
 * 投票分析结果
 */
export interface VotingAnalysis {
  aggregation: VotingAggregation;
  divergence: PerspectiveDivergence;
  blind_spots: BlindSpotAnalysis;
}

/**
 * Voting Service 单例
 */
class VotingService {
  /**
   * 验证观众投票数据
   */
  validateAudienceVote(data: unknown): AudienceVoteInput {
    return AudienceVoteSchema.parse(data);
  }

  /**
   * 汇总观众投票
   */
  aggregateVotes(debateId: number): VotingAggregation {
    const votes = voteRepository.findByDebateId(debateId);
    const agents = agentRepository.findByDebateId(debateId);
    const audienceAgents = agents.filter((a) => a.role === "audience");

    let proVotes = 0;
    let conVotes = 0;
    let drawVotes = 0;

    // 按观众类型统计
    const votesByType: Record<string, { pro: number; con: number; draw: number }> = {};

    for (const vote of votes) {
      const agent = audienceAgents.find((a) => a.id === vote.agent_id);
      if (!agent) continue;

      const audienceType = agent.audience_type || "unknown";
      if (!votesByType[audienceType]) {
        votesByType[audienceType] = { pro: 0, con: 0, draw: 0 };
      }

      if (vote.vote === "pro") {
        proVotes++;
        votesByType[audienceType].pro++;
      } else if (vote.vote === "con") {
        conVotes++;
        votesByType[audienceType].con++;
      } else {
        drawVotes++;
        votesByType[audienceType].draw++;
      }
    }

    const totalVotes = proVotes + conVotes + drawVotes;
    const totalAudience = audienceAgents.length;

    return {
      pro_votes: proVotes,
      con_votes: conVotes,
      draw_votes: drawVotes,
      total_audience: totalAudience,
      pro_percentage: totalVotes > 0 ? proVotes / totalVotes : 0,
      con_percentage: totalVotes > 0 ? conVotes / totalVotes : 0,
      draw_percentage: totalVotes > 0 ? drawVotes / totalVotes : 0,
      weighted_score: {
        pro: proVotes * 10, // 简单加权：每票10分
        con: conVotes * 10,
      },
    };
  }

  /**
   * 计算加权总分（结合裁判评分和观众投票）
   */
  calculateWeightedResult(
    debateId: number,
    judgeWeight: number,
    audienceWeight: number
  ): { pro: number; con: number; winner: "pro" | "con" | "draw" } {
    // 获取裁判评分
    const judgeScores = scoreRepository.calculateTotalScores(debateId);
    const proJudgeScore = judgeScores.get("pro")?.total || 0;
    const conJudgeScore = judgeScores.get("con")?.total || 0;

    // 获取观众投票
    const votingResult = this.aggregateVotes(debateId);

    // 归一化裁判评分（转换为0-100分制）
    const maxPossibleJudgeScore = 40 * 10; // 4维度 * 10分 * 10轮 = 400分
    const normalizedProJudge = (proJudgeScore / maxPossibleJudgeScore) * 100;
    const normalizedConJudge = (conJudgeScore / maxPossibleJudgeScore) * 100;

    // 计算观众投票得分（百分比）
    const proAudienceScore = votingResult.pro_percentage * 100;
    const conAudienceScore = votingResult.con_percentage * 100;

    // 加权计算
    const proFinalScore = normalizedProJudge * judgeWeight + proAudienceScore * audienceWeight;
    const conFinalScore = normalizedConJudge * judgeWeight + conAudienceScore * audienceWeight;

    // 判定胜负
    let winner: "pro" | "con" | "draw";
    if (Math.abs(proFinalScore - conFinalScore) < 5) {
      winner = "draw";
    } else {
      winner = proFinalScore > conFinalScore ? "pro" : "con";
    }

    return {
      pro: proFinalScore,
      con: conFinalScore,
      winner,
    };
  }

  /**
   * 分析观众视角分歧
   */
  analyzePerspectiveDivergence(debateId: number): PerspectiveDivergence {
    const votes = voteRepository.findByDebateId(debateId);
    const agents = agentRepository.findByDebateId(debateId);
    const audienceAgents = agents.filter((a) => a.role === "audience");

    const votesByType: Record<
      string,
      { pro: number; con: number; draw: number; total: number }
    > = {};

    for (const vote of votes) {
      const agent = audienceAgents.find((a) => a.id === vote.agent_id);
      if (!agent) continue;

      const audienceType = agent.audience_type || "unknown";
      if (!votesByType[audienceType]) {
        votesByType[audienceType] = { pro: 0, con: 0, draw: 0, total: 0 };
      }

      if (vote.vote === "pro") {
        votesByType[audienceType].pro++;
      } else if (vote.vote === "con") {
        votesByType[audienceType].con++;
      } else {
        votesByType[audienceType].draw++;
      }
      votesByType[audienceType].total++;
    }

    // 计算总体分歧度（使用标准差）
    const typePercentages: number[] = [];
    for (const typeData of Object.values(votesByType)) {
      if (typeData.total > 0) {
        typePercentages.push(typeData.pro / typeData.total);
      }
    }

    let overallDivergence = 0;
    if (typePercentages.length > 0) {
      const mean = typePercentages.reduce((a, b) => a + b, 0) / typePercentages.length;
      const variance = typePercentages.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / typePercentages.length;
      overallDivergence = Math.sqrt(variance);
    }

    // 找出分歧最大的轮次（简化版：使用第一轮作为示例）
    const rounds = messageRepository.getRoundsByDebateId(debateId);
    const highestDivergenceRound = rounds.length > 0 ? rounds[0].sequence : 1;

    return {
      highest_divergence_round: highestDivergenceRound,
      rational_votes: votesByType.rational || { pro: 0, con: 0, draw: 0, total: 0 },
      pragmatic_votes: votesByType.pragmatic || { pro: 0, con: 0, draw: 0, total: 0 },
      technical_votes: votesByType.technical || { pro: 0, con: 0, draw: 0, total: 0 },
      risk_averse_votes: votesByType["risk-averse"] || { pro: 0, con: 0, draw: 0, total: 0 },
      emotional_votes: votesByType.emotional || { pro: 0, con: 0, draw: 0, total: 0 },
      overall_divergence: overallDivergence,
    };
  }

  /**
   * 分析双方盲点
   */
  analyzeBlindSpots(debateId: number): BlindSpotAnalysis {
    const messages = messageRepository.findByDebateId(debateId);
    const agents = agentRepository.findByDebateId(debateId);
    const proAgent = agents.find((a) => a.role === "debater" && a.stance === "pro");
    const conAgent = agents.find((a) => a.role === "debater" && a.stance === "con");

    const proBlindSpots: string[] = [];
    const conBlindSpots: string[] = [];
    const sharedBlindSpots: string[] = [];
    const missedOpportunities: string[] = [];

    // 分析正方发言内容
    const proMessages = messages.filter((m) => m.agent_id === proAgent?.id);
    const proContent = proMessages.map((m) => m.content).join(" ");

    // 分析反方发言内容
    const conMessages = messages.filter((m) => m.agent_id === conAgent?.id);
    const conContent = conMessages.map((m) => m.content).join(" ");

    // 简化的盲点分析（基于关键词检查）

    // 检查正方是否缺少数据支持
    if (!proContent.includes("数据") && !proContent.includes("案例")) {
      proBlindSpots.push("缺乏数据和案例支持");
    }

    // 检查反方是否缺少理论框架
    if (!conContent.includes("理论") && !conContent.includes("逻辑")) {
      conBlindSpots.push("缺乏理论框架支撑");
    }

    // 检查共同的盲点
    if (!proContent.includes("成本") && !conContent.includes("成本")) {
      sharedBlindSpots.push("双方都未讨论成本因素");
    }

    if (!proContent.includes("风险") && !conContent.includes("风险")) {
      sharedBlindSpots.push("双方都未讨论潜在风险");
    }

    // 错过的机会
    if (!proContent.includes("反面") && !conContent.includes("反面")) {
      missedOpportunities.push("双方都缺乏对反方观点的深入回应");
    }

    return {
      pro_blind_spots: proBlindSpots,
      con_blind_spots: conBlindSpots,
      shared_blind_spots: sharedBlindSpots,
      missed_opportunities: missedOpportunities,
    };
  }

  /**
   * 生成完整的投票分析
   */
  generateVotingAnalysis(debateId: number): VotingAnalysis {
    return {
      aggregation: this.aggregateVotes(debateId),
      divergence: this.analyzePerspectiveDivergence(debateId),
      blind_spots: this.analyzeBlindSpots(debateId),
    };
  }
}

// 导出单例
export const votingService = new VotingService();
export default votingService;
