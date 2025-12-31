import { Debate, DebateStatus, VoteStance } from '../types/index.js';
import DebateRepository from '../repositories/debate.repository.js';
import MessageRepository from '../repositories/message.repository.js';
import ScoreRepository from '../repositories/score.repository.js';
import RoundRepository from '../repositories/round.repository.js';
import { DatabaseSchema } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import DatabaseConnection from '../db/connection.js';

/**
 * 存储的完整辩论数据接口
 */
export interface StoredDebateData {
  debate: Debate;
  messages: Array<{
    roundNum: number;
    phase: string;
    agentId: string;
    content: string;
    messageType: string;
    createdAt: string;
  }>;
  scores: Array<{
    roundNum: number;
    agentId: string;
    logic: number;
    rebuttal: number;
    clarity: number;
    evidence: number;
    total: number;
    comment?: string;
  }>;
}

/**
 * StorageService 类
 * 处理辩论数据的持久化和查询
 */
export class StorageService {
  private readonly debateRepo: DebateRepository;
  private readonly messageRepo: MessageRepository;
  private readonly scoreRepo: ScoreRepository;
  private readonly roundRepo: RoundRepository;
  private readonly schema: DatabaseSchema;

  constructor() {
    this.debateRepo = new DebateRepository();
    this.messageRepo = new MessageRepository();
    this.scoreRepo = new ScoreRepository();
    this.roundRepo = new RoundRepository();
    this.schema = new DatabaseSchema(DatabaseConnection.getConnection());
  }

  /**
   * 保存辩论结果
   */
  async saveDebateResult(data: {
    debateId: number;
    winner: VoteStance;
    summary: string;
  }): Promise<void> {
    const debate = this.debateRepo.findById(data.debateId);
    if (!debate) {
      throw new Error(`辩论 ${data.debateId} 不存在`);
    }

    this.debateRepo.setWinner(data.debateId, data.winner);
    this.debateRepo.updateStatus(data.debateId, DebateStatus.COMPLETED);

    logger.info(`保存辩论结果`, {
      debateId: data.debateId,
      winner: data.winner,
    });
  }

  /**
   * 获取完整辩论数据
   */
  async getDebateData(debateId: number): Promise<StoredDebateData> {
    const debate = this.debateRepo.findById(debateId);
    if (!debate) {
      throw new Error(`辩论 ${debateId} 不存在`);
    }

    const rounds = this.roundRepo.findByDebateId(debateId);
    const messages: StoredDebateData['messages'] = [];
    const scores: StoredDebateData['scores'] = [];

    for (const round of rounds) {
      const roundMessages = this.messageRepo.findByRoundId(round.id);
      for (const message of roundMessages) {
        messages.push({
          roundNum: round.round_num,
          phase: round.phase,
          agentId: message.agent_id,
          content: message.content,
          messageType: message.message_type,
          createdAt: message.created_at,
        });
      }

      const roundScores = this.scoreRepo.findByRoundId(round.id);
      for (const score of roundScores) {
        scores.push({
          roundNum: round.round_num,
          agentId: score.agent_id,
          logic: score.logic,
          rebuttal: score.rebuttal,
          clarity: score.clarity,
          evidence: score.evidence,
          total: score.total,
          comment: score.comment,
        });
      }
    }

    return {
      debate,
      messages,
      scores,
    };
  }

  /**
   * 获取辩论历史记录
   */
  async getDebateHistory(options?: {
    status?: DebateStatus;
    limit?: number;
    offset?: number;
  }): Promise<Debate[]> {
    return this.debateRepo.findAll(options);
  }

  /**
   * 删除辩论及相关数据
   */
  async deleteDebate(debateId: number): Promise<void> {
    // 删除顺序：评分 → 消息 → 回合 → 辩论
    const rounds = this.roundRepo.findByDebateId(debateId);

    for (const round of rounds) {
      this.messageRepo.deleteByRoundId(round.id);
      // 评分会通过外键级联删除
    }

    this.roundRepo.deleteByDebateId(debateId);

    // 删除辩论记录
    this.debateRepo.updateStatus(debateId, DebateStatus.FAILED, '已删除');

    logger.info(`删除辩论数据`, { debateId });
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    await this.schema.truncateAll();
    logger.info('清空所有辩论数据');
  }

  /**
   * 导出辩论数据为JSON
   */
  async exportDebate(debateId: number): Promise<string> {
    const data = await this.getDebateData(debateId);
    return JSON.stringify(data, null, 2);
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<{
    totalDebates: number;
    completedDebates: number;
    pendingDebates: number;
    activeDebates: number;
    failedDebates: number;
  }> {
    const total = this.debateRepo.count();
    const completed = this.debateRepo.count({ status: DebateStatus.COMPLETED });
    const pending = this.debateRepo.count({ status: DebateStatus.PENDING });
    const active = this.debateRepo.count({ status: DebateStatus.ACTIVE });
    const failed = this.debateRepo.count({ status: DebateStatus.FAILED });

    return {
      totalDebates: total,
      completedDebates: completed,
      pendingDebates: pending,
      activeDebates: active,
      failedDebates: failed,
    };
  }

  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    await this.schema.initialize();
    logger.info('数据库初始化完成');
  }
}

export default StorageService;
