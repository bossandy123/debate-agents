import { ScoreModel } from '../models/score.js';
import { JudgeAgent, ScoringResult } from '../agents/judge.js';
import { RoundModel } from '../models/round.js';
import { Message, VoteStance } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * 最终裁决结果接口
 */
export interface FinalJudgment {
  winner: VoteStance;
  summary: string;
  keyTurningRound?: number;
  blindSpots: {
    pro: string[];
    con: string[];
  };
}

/**
 * 评分汇总接口
 */
export interface ScoreSummary {
  proTotal: number;
  conTotal: number;
  winner: VoteStance;
  roundScores: Array<{
    roundNum: number;
    proScore: ScoringResult;
    conScore: ScoringResult;
  }>;
}

/**
 * ScoringService 类
 * 处理辩论评分和胜负判定
 */
export class ScoringService {
  private readonly judgeAgent: JudgeAgent;

  constructor(judgeAgent: JudgeAgent) {
    this.judgeAgent = judgeAgent;
  }

  /**
   * 评分单个回合
   * @param round 回合模型
   * @param proAgentId 正方Agent ID
   * @param conAgentId 反方Agent ID
   * @param allMessages 所有消息
   * @param topic 辩题
   */
  async scoreRound(
    round: RoundModel,
    proAgentId: string,
    conAgentId: string,
    allMessages: Message[],
    topic: string
  ): Promise<{
    proScore: ScoreModel;
    conScore: ScoreModel;
  }> {
    logger.info(`开始评分回合 ${round.roundNum}`, {
      debateId: round.debateId,
      phase: round.phase,
    });

    // 调用裁判Agent评分
    const result = await this.judgeAgent.scoreRound(
      proAgentId,
      conAgentId,
      {
        debateId: round.debateId,
        roundNum: round.roundNum,
        phase: round.phase,
        topic,
        allMessages,
      }
    );

    // 保存评分到数据库
    const proScore = await ScoreModel.create(
      round.id,
      proAgentId,
      result.proScore.logic,
      result.proScore.rebuttal,
      result.proScore.clarity,
      result.proScore.evidence,
      result.proScore.comment
    );

    const conScore = await ScoreModel.create(
      round.id,
      conAgentId,
      result.conScore.logic,
      result.conScore.rebuttal,
      result.conScore.clarity,
      result.conScore.evidence,
      result.conScore.comment
    );

    logger.info(`回合 ${round.roundNum} 评分完成`, {
      debateId: round.debateId,
      proTotal: proScore.total,
      conTotal: conScore.total,
    });

    return { proScore, conScore };
  }

  /**
   * 计算最终胜者
   * @param allRounds 所有回合
   * @param topic 辩题
   * @param allMessages 所有消息
   */
  async calculateWinner(
    allRounds: RoundModel[],
    topic: string,
    allMessages: Message[]
  ): Promise<FinalJudgment> {
    logger.info('开始计算最终胜者', {
      roundCount: allRounds.length,
    });

    // 收集所有回合的评分
    const roundScores: Array<{
      roundNum: number;
      proScore: ScoringResult;
      conScore: ScoringResult;
    }> = [];

    for (const round of allRounds) {
      const scores = await ScoreModel.findByRoundId(round.id);

      // 假设评分按总分排序，第一个是正方，第二个是反方
      if (scores.length >= 2) {
        roundScores.push({
          roundNum: round.roundNum,
          proScore: this.convertToScoringResult(scores[0]),
          conScore: this.convertToScoringResult(scores[1]),
        });
      }
    }

    // 调用裁判Agent生成最终裁决
    const judgment = await this.judgeAgent.renderFinalJudgment(
      {
        debateId: allRounds[0]?.debateId || 0,
        roundNum: allRounds.length,
        phase: 'summary' as any,
        topic,
        allMessages,
      },
      roundScores
    );

    logger.info('最终裁决完成', {
      winner: judgment.winner,
      hasSummary: !!judgment.summary,
    });

    return judgment;
  }

  /**
   * 简单计算胜者（基于评分总分）
   * @param debateId 辩论ID
   * @param proAgentId 正方Agent ID
   * @param conAgentId 反方Agent ID
   */
  async calculateSimpleWinner(
    debateId: number,
    proAgentId: string,
    conAgentId: string
  ): Promise<{
    winner: VoteStance;
    proTotal: number;
    conTotal: number;
  }> {
    const proTotal = await ScoreModel.getTotalScoreByAgent(debateId, proAgentId);
    const conTotal = await ScoreModel.getTotalScoreByAgent(debateId, conAgentId);

    const threshold = (proTotal + conTotal) * 0.1; // 10%阈值

    let winner: VoteStance;

    if (Math.abs(proTotal - conTotal) <= threshold) {
      winner = VoteStance.DRAW;
    } else if (proTotal > conTotal) {
      winner = VoteStance.PRO;
    } else {
      winner = VoteStance.CON;
    }

    logger.info('简单胜负计算完成', {
      proTotal,
      conTotal,
      winner,
      threshold,
    });

    return { winner, proTotal, conTotal };
  }

  /**
   * 获取评分汇总
   * @param debateId 辩论ID
   */
  async getScoreSummary(debateId: number): Promise<ScoreSummary> {
    const rounds = await RoundModel.findByDebateId(debateId);
    const roundScores: Array<{
      roundNum: number;
      proScore: ScoringResult;
      conScore: ScoringResult;
    }> = [];

    let proTotal = 0;
    let conTotal = 0;

    for (const round of rounds) {
      const scores = await ScoreModel.findByRoundId(round.id);

      if (scores.length >= 2) {
        const proScore = this.convertToScoringResult(scores[0]);
        const conScore = this.convertToScoringResult(scores[1]);

        roundScores.push({ roundNum: round.roundNum, proScore, conScore });
        proTotal += proScore.total;
        conTotal += conScore.total;
      }
    }

    const threshold = (proTotal + conTotal) * 0.1;
    let winner: VoteStance;

    if (Math.abs(proTotal - conTotal) <= threshold) {
      winner = VoteStance.DRAW;
    } else if (proTotal > conTotal) {
      winner = VoteStance.PRO;
    } else {
      winner = VoteStance.CON;
    }

    return {
      proTotal,
      conTotal,
      winner,
      roundScores,
    };
  }

  /**
   * 将ScoreModel转换为ScoringResult
   */
  private convertToScoringResult(score: ScoreModel): ScoringResult {
    return {
      logic: score.logic,
      rebuttal: score.rebuttal,
      clarity: score.clarity,
      evidence: score.evidence,
      total: score.total,
      comment: score.comment || '',
    };
  }
}

export default ScoringService;
