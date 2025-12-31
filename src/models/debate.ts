import { Debate, DebateStatus, VoteStance } from '../types/index.js';
import DebateRepository from '../repositories/debate.repository.js';
import { logger } from '../utils/logger.js';

/**
 * Debate 模型类
 * 封装辩论相关的业务逻辑
 */
export class DebateModel {
  private readonly debate: Debate;
  private readonly repository: DebateRepository;

  constructor(debate: Debate) {
    this.debate = debate;
    this.repository = new DebateRepository();
  }

  /**
   * 获取辩论ID
   */
  get id(): number {
    return this.debate.id;
  }

  /**
   * 获取辩题
   */
  get topic(): string {
    return this.debate.topic;
  }

  /**
   * 获取状态
   */
  get status(): DebateStatus {
    return this.debate.status;
  }

  /**
   * 获取创建时间
   */
  get createdAt(): string {
    return this.debate.created_at;
  }

  /**
   * 获取完成时间
   */
  get completedAt(): string | undefined {
    return this.debate.completed_at;
  }

  /**
   * 获取胜者
   */
  get winner(): VoteStance | undefined {
    return this.debate.winner;
  }

  /**
   * 获取错误消息
   */
  get errorMessage(): string | undefined {
    return this.debate.error_message;
  }

  /**
   * 是否待处理
   */
  isPending(): boolean {
    return this.debate.status === DebateStatus.PENDING;
  }

  /**
   * 是否进行中
   */
  isActive(): boolean {
    return this.debate.status === DebateStatus.ACTIVE;
  }

  /**
   * 是否已完成
   */
  isCompleted(): boolean {
    return this.debate.status === DebateStatus.COMPLETED;
  }

  /**
   * 是否失败
   */
  isFailed(): boolean {
    return this.debate.status === DebateStatus.FAILED;
  }

  /**
   * 启动辩论
   */
  async start(): Promise<void> {
    if (!this.isPending()) {
      throw new Error(`辩论 ${this.id} 状态不是待处理，无法启动`);
    }

    this.repository.updateStatus(this.id, DebateStatus.ACTIVE);
    logger.info(`辩论 ${this.id} 已启动`, { topic: this.debate.topic });
  }

  /**
   * 完成辩论
   */
  async complete(winner: VoteStance): Promise<void> {
    if (!this.isActive()) {
      throw new Error(`辩论 ${this.id} 状态不是进行中，无法完成`);
    }

    const completedAt = new Date().toISOString();
    this.repository.updateStatus(this.id, DebateStatus.COMPLETED, completedAt);
    this.repository.setWinner(this.id, winner);

    logger.info(`辩论 ${this.id} 已完成`, {
      topic: this.debate.topic,
      winner,
      completedAt,
    });
  }

  /**
   * 标记辩论为失败
   */
  async fail(errorMessage: string): Promise<void> {
    this.repository.setError(this.id, errorMessage);

    logger.error(`辩论 ${this.id} 失败`, {
      topic: this.debate.topic,
      error: errorMessage,
    });
  }

  /**
   * 刷新状态
   */
  async refresh(): Promise<DebateModel> {
    const updated = this.repository.findById(this.id);
    if (!updated) {
      throw new Error(`辩论 ${this.id} 不存在`);
    }

    return new DebateModel(updated);
  }

  /**
   * 转换为普通对象
   */
  toObject(): Debate {
    return { ...this.debate };
  }

  /**
   * 创建新辩论
   */
  static async create(topic: string): Promise<DebateModel> {
    const repository = new DebateRepository();

    const debate = repository.create({
      topic,
      status: DebateStatus.PENDING,
      created_at: new Date().toISOString(),
    });

    logger.info(`创建新辩论`, { id: debate.id, topic });

    return new DebateModel(debate);
  }

  /**
   * 根据ID查找辩论
   */
  static async findById(id: number): Promise<DebateModel | null> {
    const repository = new DebateRepository();
    const debate = repository.findById(id);

    if (!debate) {
      return null;
    }

    return new DebateModel(debate);
  }

  /**
   * 获取所有辩论
   */
  static async findAll(options?: {
    status?: DebateStatus;
    limit?: number;
    offset?: number;
  }): Promise<DebateModel[]> {
    const repository = new DebateRepository();
    const debates = repository.findAll(options);

    return debates.map(debate => new DebateModel(debate));
  }
}

export default DebateModel;
