import { Round, RoundStatus, RoundPhase } from '../types/index.js';
import RoundRepository from '../repositories/round.repository.js';
import { logger } from '../utils/logger.js';

/**
 * Round 模型类
 * 封装回合相关的业务逻辑
 */
export class RoundModel {
  private readonly round: Round;
  private readonly repository: RoundRepository;

  constructor(round: Round) {
    this.round = round;
    this.repository = new RoundRepository();
  }

  /**
   * 获取回合ID
   */
  get id(): number {
    return this.round.id;
  }

  /**
   * 获取辩论ID
   */
  get debateId(): number {
    return this.round.debate_id;
  }

  /**
   * 获取回合序号
   */
  get roundNum(): number {
    return this.round.round_num;
  }

  /**
   * 获取阶段
   */
  get phase(): RoundPhase {
    return this.round.phase;
  }

  /**
   * 获取状态
   */
  get status(): RoundStatus {
    return this.round.status;
  }

  /**
   * 获取开始时间
   */
  get startedAt(): string | undefined {
    return this.round.started_at;
  }

  /**
   * 获取完成时间
   */
  get completedAt(): string | undefined {
    return this.round.completed_at;
  }

  /**
   * 是否待处理
   */
  isPending(): boolean {
    return this.round.status === RoundStatus.PENDING;
  }

  /**
   * 是否进行中
   */
  isInProgress(): boolean {
    return this.round.status === RoundStatus.IN_PROGRESS;
  }

  /**
   * 是否已完成
   */
  isCompleted(): boolean {
    return this.round.status === RoundStatus.COMPLETED;
  }

  /**
   * 是否为立论阶段
   */
  isOpening(): boolean {
    return this.round.phase === RoundPhase.OPENING;
  }

  /**
   * 是否为反驳阶段
   */
  isRebuttal(): boolean {
    return this.round.phase === RoundPhase.REBUTTAL;
  }

  /**
   * 是否为关键战役阶段
   */
  isCritical(): boolean {
    return this.round.phase === RoundPhase.CRITICAL;
  }

  /**
   * 是否为终局攻防阶段
   */
  isClosing(): boolean {
    return this.round.phase === RoundPhase.CLOSING;
  }

  /**
   * 是否为总结陈词阶段
   */
  isSummary(): boolean {
    return this.round.phase === RoundPhase.SUMMARY;
  }

  /**
   * 启动回合
   */
  async start(): Promise<void> {
    if (!this.isPending()) {
      throw new Error(`回合 ${this.id} 状态不是待处理，无法启动`);
    }

    const startedAt = new Date().toISOString();
    this.repository.updateStatus(this.id, RoundStatus.IN_PROGRESS, startedAt);

    logger.debug(`回合 ${this.round.round_num} 已启动`, {
      debateId: this.round.debate_id,
      phase: this.round.phase,
    });
  }

  /**
   * 完成回合
   */
  async complete(): Promise<void> {
    if (!this.isInProgress()) {
      throw new Error(`回合 ${this.id} 状态不是进行中，无法完成`);
    }

    const completedAt = new Date().toISOString();
    this.repository.updateStatus(this.id, RoundStatus.COMPLETED, undefined, completedAt);

    logger.debug(`回合 ${this.round.round_num} 已完成`, {
      debateId: this.round.debate_id,
      phase: this.round.phase,
    });
  }

  /**
   * 刷新状态
   */
  async refresh(): Promise<RoundModel> {
    const updated = this.repository.findById(this.id);
    if (!updated) {
      throw new Error(`回合 ${this.id} 不存在`);
    }

    return new RoundModel(updated);
  }

  /**
   * 转换为普通对象
   */
  toObject(): Round {
    return { ...this.round };
  }

  /**
   * 创建新回合
   */
  static async create(
    debateId: number,
    roundNum: number,
    phase: RoundPhase
  ): Promise<RoundModel> {
    const repository = new RoundRepository();

    const round = repository.create({
      debate_id: debateId,
      round_num: roundNum,
      phase,
      status: RoundStatus.PENDING,
    });

    logger.debug(`创建新回合`, {
      debateId,
      roundNum,
      phase,
    });

    return new RoundModel(round);
  }

  /**
   * 根据ID查找回合
   */
  static async findById(id: number): Promise<RoundModel | null> {
    const repository = new RoundRepository();
    const round = repository.findById(id);

    if (!round) {
      return null;
    }

    return new RoundModel(round);
  }

  /**
   * 获取辩论的所有回合
   */
  static async findByDebateId(debateId: number): Promise<RoundModel[]> {
    const repository = new RoundRepository();
    const rounds = repository.findByDebateId(debateId);

    return rounds.map(round => new RoundModel(round));
  }

  /**
   * 获取辩论指定序号的回合
   */
  static async findByDebateAndRoundNum(
    debateId: number,
    roundNum: number
  ): Promise<RoundModel | null> {
    const repository = new RoundRepository();
    const round = repository.findByDebateAndRoundNum(debateId, roundNum);

    if (!round) {
      return null;
    }

    return new RoundModel(round);
  }

  /**
   * 根据回合序号确定阶段
   */
  static getPhaseForRoundNum(roundNum: number): RoundPhase {
    if (roundNum <= 2) {
      return RoundPhase.OPENING;
    } else if (roundNum <= 6) {
      return RoundPhase.REBUTTAL;
    } else if (roundNum <= 8) {
      return RoundPhase.CRITICAL;
    } else if (roundNum === 9) {
      return RoundPhase.CLOSING;
    } else {
      return RoundPhase.SUMMARY;
    }
  }
}

export default RoundModel;
