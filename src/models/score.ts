import { Score } from '../types/index.js';
import ScoreRepository from '../repositories/score.repository.js';
import { logger } from '../utils/logger.js';

/**
 * Score 模型类
 * 封装评分相关的业务逻辑
 */
export class ScoreModel {
  private readonly score: Score;
  private readonly repository: ScoreRepository;

  constructor(score: Score) {
    this.score = score;
    this.repository = new ScoreRepository();
  }

  /**
   * 获取评分ID
   */
  get id(): number {
    return this.score.id;
  }

  /**
   * 获取回合ID
   */
  get roundId(): number {
    return this.score.round_id;
  }

  /**
   * 获取Agent ID
   */
  get agentId(): string {
    return this.score.agent_id;
  }

  /**
   * 获取逻辑得分
   */
  get logic(): number {
    return this.score.logic;
  }

  /**
   * 获取反驳得分
   */
  get rebuttal(): number {
    return this.score.rebuttal;
  }

  /**
   * 获取清晰度得分
   */
  get clarity(): number {
    return this.score.clarity;
  }

  /**
   * 获取论据得分
   */
  get evidence(): number {
    return this.score.evidence;
  }

  /**
   * 获取总分
   */
  get total(): number {
    return this.score.total;
  }

  /**
   * 获取评论
   */
  get comment(): string | undefined {
    return this.score.comment;
  }

  /**
   * 检查评分是否有效（所有维度在0-10之间）
   */
  isValid(): boolean {
    const { logic, rebuttal, clarity, evidence } = this.score;
    return (
      logic >= 0 &&
      logic <= 10 &&
      rebuttal >= 0 &&
      rebuttal <= 10 &&
      clarity >= 0 &&
      clarity <= 10 &&
      evidence >= 0 &&
      evidence <= 10
    );
  }

  /**
   * 转换为普通对象
   */
  toObject(): Score {
    return { ...this.score };
  }

  /**
   * 创建新评分
   */
  static async create(
    roundId: number,
    agentId: string,
    logic: number,
    rebuttal: number,
    clarity: number,
    evidence: number,
    comment?: string
  ): Promise<ScoreModel> {
    const repository = new ScoreRepository();

    // 计算总分（四个维度的和）
    const total = logic + rebuttal + clarity + evidence;

    const score = repository.create({
      round_id: roundId,
      agent_id: agentId,
      logic,
      rebuttal,
      clarity,
      evidence,
      total,
      comment,
    });

    logger.debug(`创建新评分`, {
      roundId,
      agentId,
      total,
      logic,
      rebuttal,
      clarity,
      evidence,
    });

    return new ScoreModel(score);
  }

  /**
   * 批量创建评分
   */
  static async createBatch(
    scores: Array<{
      roundId: number;
      agentId: string;
      logic: number;
      rebuttal: number;
      clarity: number;
      evidence: number;
      comment?: string;
    }>
  ): Promise<ScoreModel[]> {
    const repository = new ScoreRepository();

    const scoresToCreate = scores.map(s => ({
      round_id: s.roundId,
      agent_id: s.agentId,
      logic: s.logic,
      rebuttal: s.rebuttal,
      clarity: s.clarity,
      evidence: s.evidence,
      total: s.logic + s.rebuttal + s.clarity + s.evidence,
      comment: s.comment,
    }));

    const createdScores = repository.createBatch(scoresToCreate);

    logger.info(`批量创建 ${createdScores.length} 条评分`);

    return createdScores.map(s => new ScoreModel(s));
  }

  /**
   * 根据ID查找评分
   */
  static async findById(id: number): Promise<ScoreModel | null> {
    const repository = new ScoreRepository();
    const score = repository.findById(id);

    if (!score) {
      return null;
    }

    return new ScoreModel(score);
  }

  /**
   * 获取回合的所有评分
   */
  static async findByRoundId(roundId: number): Promise<ScoreModel[]> {
    const repository = new ScoreRepository();
    const scores = repository.findByRoundId(roundId);

    return scores.map(score => new ScoreModel(score));
  }

  /**
   * 获取指定Agent在回合中的评分
   */
  static async findByRoundAndAgent(
    roundId: number,
    agentId: string
  ): Promise<ScoreModel | null> {
    const repository = new ScoreRepository();
    const score = repository.findByRoundAndAgent(roundId, agentId);

    if (!score) {
      return null;
    }

    return new ScoreModel(score);
  }

  /**
   * 获取指定Agent在辩论中的所有评分
   */
  static async findByDebateAndAgent(
    debateId: number,
    agentId: string
  ): Promise<ScoreModel[]> {
    const repository = new ScoreRepository();
    const scores = repository.findByDebateAndAgent(debateId, Number(agentId));

    return scores.map(score => new ScoreModel(score));
  }

  /**
   * 计算指定Agent在辩论中的总分
   */
  static async getTotalScoreByAgent(debateId: number, agentId: string): Promise<number> {
    const repository = new ScoreRepository();
    return repository.getTotalScoreByAgent(debateId, Number(agentId));
  }
}

export default ScoreModel;
