/**
 * Scoring Service
 * 评分计算服务和最终裁决生成
 */

import { z } from "zod";
import { debateRepository } from "@/lib/repositories/debate.repository";
import { scoreRepository } from "@/lib/repositories/score.repository";
import { roundRepository } from "@/lib/repositories/round.repository";
import { messageRepository } from "@/lib/repositories/message.repository";

/**
 * 犯规类型定义
 */
export const FOUL_TYPES = {
  AD_HOMINEM: "ad_hominem", // 人身攻击
  OFF_TOPIC: "off_topic", // 偏离主题
  DISRUPTION: "disruption", // 干扰秩序
  OTHER: "other", // 其他
} as const;

/**
 * 裁判评分 Schema（Zod 验证）
 */
export const JudgeScoreSchema = z.object({
  logic: z.number().int().min(1).max(10),
  rebuttal: z.number().int().min(1).max(10),
  clarity: z.number().int().min(1).max(10),
  evidence: z.number().int().min(1).max(10),
  comment: z.string().max(500),
  fouls: z.array(z.enum([FOUL_TYPES.AD_HOMINEM, FOUL_TYPES.OFF_TOPIC, FOUL_TYPES.DISRUPTION, FOUL_TYPES.OTHER])).optional().default([]),
});

export type JudgeScoreInput = z.infer<typeof JudgeScoreSchema>;

/**
 * 犯规检测 Schema
 */
export const FoulDetectionSchema = z.object({
  has_foul: z.boolean(),
  foul_type: z.enum([
    FOUL_TYPES.AD_HOMINEM,
    FOUL_TYPES.OFF_TOPIC,
    FOUL_TYPES.DISRUPTION,
    FOUL_TYPES.OTHER,
  ]).nullable(),
  reason: z.string().nullable(),
});

export type FoulDetectionInput = z.infer<typeof FoulDetectionSchema>;

/**
 * 最终裁决结构
 */
export interface FinalJudgment {
  debate_id: number;
  winner: "pro" | "con" | "draw";
  final_scores: {
    pro: number;
    con: number;
  };
  judge_scores: {
    pro: number;
    con: number;
  };
  audience_scores?: {
    pro: number;
    con: number;
  };
  key_turning_round?: number;
  winning_arguments: {
    pro: string[];
    con: string[];
  };
  foul_records: {
    agent_id: string;
    round_id: number;
    foul_type: string;
  }[];
  summary: string;
}

/**
 * 单轮评分结果
 */
export interface RoundScoreSummary {
  round_id: number;
  sequence: number;
  pro_score: number;
  con_score: number;
  pro_fouls: string[];
  con_fouls: string[];
}

/**
 * Scoring Service 单例
 */
class ScoringService {
  /**
   * 验证裁判评分数据
   */
  validateJudgeScore(data: unknown): JudgeScoreInput {
    return JudgeScoreSchema.parse(data);
  }

  /**
   * 验证犯规检测数据
   */
  validateFoulDetection(data: unknown): FoulDetectionInput {
    return FoulDetectionSchema.parse(data);
  }

  /**
   * 计算加权总分
   */
  calculateWeightedScore(
    judgeScore: number,
    audienceScore: number,
    judgeWeight: number,
    audienceWeight: number
  ): number {
    return judgeScore * judgeWeight + audienceScore * audienceWeight;
  }

  /**
   * 判定胜负
   */
  determineWinner(
    proScore: number,
    conScore: number,
    threshold: number = 0.1
  ): "pro" | "con" | "draw" {
    const diff = Math.abs(proScore - conScore);
    if (diff < threshold) {
      return "draw";
    }
    return proScore > conScore ? "pro" : "con";
  }

  /**
   * 计算总分（按立场分组）
   */
  calculateTotalScores(debateId: number): Map<string, number> {
    const pairSummary = scoreRepository.getDebatePairSummary(debateId);

    const result = new Map<string, number>();
    if (pairSummary) {
      result.set("pro", pairSummary.pro.total);
      result.set("con", pairSummary.con.total);
    }

    return result;
  }

  /**
   * 查找关键转折轮次
   */
  findKeyTurningRound(debateId: number): number | undefined {
    const rounds = roundRepository.findByDebateId(debateId);
    const scoreHistories: Array<{ round: number; pro: number; con: number; diff: number }> = [];

    let cumulativePro = 0;
    let cumulativeCon = 0;

    for (const round of rounds) {
      const scores = scoreRepository.findByRoundId(round.id);

      let proRoundScore = 0;
      let conRoundScore = 0;

      for (const score of scores) {
        if (score.agent_id.includes("pro")) {
          proRoundScore += score.logic + score.rebuttal + score.clarity + score.evidence;
        } else if (score.agent_id.includes("con")) {
          conRoundScore += score.logic + score.rebuttal + score.clarity + score.evidence;
        }
      }

      cumulativePro += proRoundScore;
      cumulativeCon += conRoundScore;

      scoreHistories.push({
        round: round.sequence,
        pro: cumulativePro,
        con: cumulativeCon,
        diff: Math.abs(cumulativePro - cumulativeCon),
      });
    }

    // 找出领先关系发生变化的轮次
    for (let i = 1; i < scoreHistories.length; i++) {
      const prev = scoreHistories[i - 1];
      const curr = scoreHistories[i];

      const prevLeader = prev.pro > prev.con ? "pro" : "con";
      const currLeader = curr.pro > curr.con ? "pro" : "con";

      if (prevLeader !== currLeader) {
        return curr.round;
      }
    }

    // 如果没有领先变化，返回分差最大的轮次
    const maxDiffRound = scoreHistories.reduce((max, curr) =>
      curr.diff > max.diff ? curr : max
    , scoreHistories[0]);

    return maxDiffRound?.round;
  }

  /**
   * 提取决胜论点
   */
  extractWinningArguments(debateId: number): { pro: string[]; con: string[] } {
    const messages = messageRepository.findByDebateId(debateId);
    const scores = scoreRepository.calculateTotalScores(debateId);

    const proScore = scores.get("pro")?.total || 0;
    const conScore = scores.get("con")?.total || 0;

    const winner = this.determineWinner(proScore, conScore);

    // 获取胜方得分最高的轮次
    const rounds = roundRepository.findByDebateId(debateId);
    const winningMessages: string[] = [];

    for (const round of rounds) {
      const roundScores = scoreRepository.findByRoundId(round.id);
      const roundMessages = messages.filter((m) => m.round_id === round.id);

      for (const score of roundScores) {
        const isWinner = winner === "pro"
          ? score.agent_id.includes("pro")
          : score.agent_id.includes("con");

        if (isWinner) {
          const agentMessage = roundMessages.find((m) => m.agent_id === score.agent_id);
          if (agentMessage) {
            // 提取关键论点（取前100字）
            const argument = agentMessage.content.substring(0, 100) + "...";
            winningMessages.push(argument);
          }
        }
      }
    }

    return {
      pro: winner === "pro" ? winningMessages.slice(0, 3) : [],
      con: winner === "con" ? winningMessages.slice(0, 3) : [],
    };
  }

  /**
   * 收集犯规记录
   */
  collectFoulRecords(debateId: number): Array<{
    agent_id: string;
    round_id: number;
    foul_type: string;
  }> {
    const foulRecords: Array<{
      agent_id: string;
    round_id: number;
    foul_type: string;
    }> = [];

    const rounds = roundRepository.findByDebateId(debateId);

    for (const round of rounds) {
      const scores = scoreRepository.findByRoundId(round.id);

      for (const score of scores) {
        // 犯规记录存储在 comment 中，以 "FOUL:" 前缀标记
        if (score.comment && score.comment.includes("FOUL:")) {
          const foulMatch = score.comment.match(/FOUL:\s*(\w+)/);
          if (foulMatch) {
            foulRecords.push({
              agent_id: score.agent_id,
              round_id: round.id,
              foul_type: foulMatch[1],
            });
          }
        }
      }
    }

    return foulRecords;
  }

  /**
   * 生成最终裁决
   */
  async generateFinalJudgment(debateId: number): Promise<FinalJudgment> {
    const debate = debateRepository.findById(debateId);
    if (!debate) {
      throw new Error(`辩论 ${debateId} 不存在`);
    }

    const judgeScores = this.calculateTotalScores(debateId);
    const proJudgeScore = judgeScores.get("pro") || 0;
    const conJudgeScore = judgeScores.get("con") || 0;

    // 计算加权结果
    const judgeWeight = debate.judge_weight || 0.5;
    // TODO: 观众投票功能未实现，后续会使用此权重
    // const audienceWeight = debate.audience_weight || 0.5;

    // 目前只有裁判评分
    const proFinalScore = proJudgeScore * judgeWeight;
    const conFinalScore = conJudgeScore * judgeWeight;

    const winner = this.determineWinner(proFinalScore, conFinalScore);

    return {
      debate_id: debateId,
      winner,
      final_scores: {
        pro: proFinalScore,
        con: conFinalScore,
      },
      judge_scores: {
        pro: proJudgeScore,
        con: conJudgeScore,
      },
      key_turning_round: this.findKeyTurningRound(debateId),
      winning_arguments: this.extractWinningArguments(debateId),
      foul_records: this.collectFoulRecords(debateId),
      summary: this.generateSummary(winner, proFinalScore, conFinalScore),
    };
  }

  /**
   * 生成裁决摘要
   */
  private generateSummary(
    winner: "pro" | "con" | "draw",
    proScore: number,
    conScore: number
  ): string {
    if (winner === "draw") {
      return `双方表现旗鼓相当，最终比分为 ${proScore.toFixed(1)} : ${conScore.toFixed(1)}，判定为平局。`;
    }

    const winnerName = winner === "pro" ? "正方" : "反方";
    const diff = Math.abs(proScore - conScore);

    return `${winnerName}以 ${proScore.toFixed(1)} : ${conScore.toFixed(1)} 的比分获胜，领先 ${diff.toFixed(1)} 分。`;
  }

  /**
   * 应用犯规处罚
   */
  applyFoulPenalty(baseScore: number, foulCount: number): number {
    // 每次犯规扣 2 分
    const penalty = foulCount * 2;
    return Math.max(1, baseScore - penalty);
  }

  /**
   * 获取轮次评分汇总
   */
  getRoundScoreSummaries(debateId: number): RoundScoreSummary[] {
    const rounds = roundRepository.findByDebateId(debateId);
    const summaries: RoundScoreSummary[] = [];

    for (const round of rounds) {
      const scores = scoreRepository.findByRoundId(round.id);

      let proScore = 0;
      let conScore = 0;
      const proFouls: string[] = [];
      const conFouls: string[] = [];

      for (const score of scores) {
        const totalScore = score.logic + score.rebuttal + score.clarity + score.evidence;

        if (score.agent_id.includes("pro")) {
          proScore = totalScore;
          if (score.comment && score.comment.includes("FOUL:")) {
            const foulMatch = score.comment.match(/FOUL:\s*(\w+)/);
            if (foulMatch) proFouls.push(foulMatch[1]);
          }
        } else if (score.agent_id.includes("con")) {
          conScore = totalScore;
          if (score.comment && score.comment.includes("FOUL:")) {
            const foulMatch = score.comment.match(/FOUL:\s*(\w+)/);
            if (foulMatch) conFouls.push(foulMatch[1]);
          }
        }
      }

      summaries.push({
        round_id: round.id,
        sequence: round.sequence,
        pro_score: proScore,
        con_score: conScore,
        pro_fouls: proFouls,
        con_fouls: conFouls,
      });
    }

    return summaries;
  }
}

// 导出单例
export const scoringService = new ScoringService();
export default scoringService;
