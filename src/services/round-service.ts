import { RoundPhase, RoundStatus, Message, MessageType } from '../types/index.js';
import { RoundModel } from '../models/round.js';
import { MessageModel } from '../models/message.js';
import { BaseAgent } from '../agents/base.js';
import { logger } from '../utils/logger.js';
import RoundRepository from '../repositories/round.repository.js';

/**
 * 回合执行结果接口
 */
export interface RoundExecutionResult {
  roundId: number;
  messages: Message[];
  success: boolean;
  error?: string;
}

/**
 * RoundService 类
 * 管理单个回合的执行流程
 */
export class RoundService {
  private readonly round: RoundModel;

  constructor(round: RoundModel) {
    this.round = round;
  }

  /**
   * 执行回合
   * @param proAgent 正方Agent
   * @param conAgent 反方Agent
   * @param context 执行上下文
   */
  async execute(
    proAgent: BaseAgent,
    conAgent: BaseAgent,
    context: {
      debateId: number;
      topic: string;
      allMessages: Message[];
      currentRoundNum: number;
    }
  ): Promise<RoundExecutionResult> {
    try {
      // 启动回合
      await this.round.start();
      logger.info(`回合 ${this.round.roundNum} 开始执行`, {
        debateId: context.debateId,
        phase: this.round.phase,
      });

      // 执行正方发言
      const proResult = await proAgent.executeWithValidation({
        debateId: context.debateId,
        roundNum: this.round.roundNum,
        phase: this.round.phase,
        topic: context.topic,
        allMessages: context.allMessages,
      });

      const proMessage = await MessageModel.create(
        this.round.id,
        proAgent.id,
        proResult.content,
        proResult.messageType
      );

      logger.debug(`正方发言完成`, {
        roundId: this.round.id,
        agentId: proAgent.id,
        contentLength: proResult.content.length,
      });

      // 更新上下文
      const messagesWithPro = [
        ...context.allMessages,
        proMessage.toObject(),
      ];

      // 执行反方发言
      const conResult = await conAgent.executeWithValidation({
        debateId: context.debateId,
        roundNum: this.round.roundNum,
        phase: this.round.phase,
        topic: context.topic,
        allMessages: messagesWithPro,
      });

      const conMessage = await MessageModel.create(
        this.round.id,
        conAgent.id,
        conResult.content,
        conResult.messageType
      );

      logger.debug(`反方发言完成`, {
        roundId: this.round.id,
        agentId: conAgent.id,
        contentLength: conResult.content.length,
      });

      // 完成回合
      await this.round.complete();

      // 获取回合所有消息
      const allMessages = await MessageModel.findByRoundId(this.round.id);

      logger.info(`回合 ${this.round.roundNum} 执行完成`, {
        debateId: context.debateId,
        messageCount: allMessages.length,
      });

      return {
        roundId: this.round.id,
        messages: allMessages.map(m => m.toObject()),
        success: true,
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error(`回合 ${this.round.roundNum} 执行失败`, {
        debateId: context.debateId,
        error: errorMessage,
      });

      return {
        roundId: this.round.id,
        messages: [],
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 获取回合模型
   */
  getRound(): RoundModel {
    return this.round;
  }

  /**
   * 创建并执行回合（静态工厂方法）
   */
  static async createAndExecute(
    debateId: number,
    roundNum: number,
    phase: RoundPhase,
    proAgent: BaseAgent,
    conAgent: BaseAgent,
    context: {
      topic: string;
      allMessages: Message[];
    }
  ): Promise<RoundExecutionResult> {
    // 创建回合
    const round = await RoundModel.create(debateId, roundNum, phase);

    // 创建服务并执行
    const service = new RoundService(round);
    return service.execute(proAgent, conAgent, {
      debateId,
      topic: context.topic,
      allMessages: context.allMessages,
      currentRoundNum: roundNum,
    });
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

  /**
   * 获取回合的阶段描述
   */
  static getPhaseDescription(phase: RoundPhase): string {
    switch (phase) {
      case RoundPhase.OPENING:
        return '立论阶段';
      case RoundPhase.REBUTTAL:
        return '反驳阶段';
      case RoundPhase.CRITICAL:
        return '关键战役';
      case RoundPhase.CLOSING:
        return '终局攻防';
      case RoundPhase.SUMMARY:
        return '总结陈词';
      default:
        return '未知阶段';
    }
  }
}

export default RoundService;
