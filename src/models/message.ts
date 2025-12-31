import { Message, MessageType } from '../types/index.js';
import MessageRepository from '../repositories/message.repository.js';
import { logger } from '../utils/logger.js';

/**
 * Message 模型类
 * 封装消息相关的业务逻辑
 */
export class MessageModel {
  private readonly message: Message;
  private readonly repository: MessageRepository;

  constructor(message: Message) {
    this.message = message;
    this.repository = new MessageRepository();
  }

  /**
   * 获取消息ID
   */
  get id(): number {
    return this.message.id;
  }

  /**
   * 获取回合ID
   */
  get roundId(): number {
    return this.message.round_id;
  }

  /**
   * 获取Agent ID
   */
  get agentId(): string {
    return this.message.agent_id;
  }

  /**
   * 获取内容
   */
  get content(): string {
    return this.message.content;
  }

  /**
   * 获取消息类型
   */
  get messageType(): MessageType {
    return this.message.message_type;
  }

  /**
   * 获取创建时间
   */
  get createdAt(): string {
    return this.message.created_at;
  }

  /**
   * 是否为论点
   */
  isArgument(): boolean {
    return this.message.message_type === MessageType.ARGUMENT;
  }

  /**
   * 是否为反驳
   */
  isRebuttal(): boolean {
    return this.message.message_type === MessageType.REBUTTAL;
  }

  /**
   * 是否为裁判评论
   */
  isJudgeComment(): boolean {
    return this.message.message_type === MessageType.JUDGE_COMMENT;
  }

  /**
   * 是否为观众支持
   */
  isAudienceSupport(): boolean {
    return this.message.message_type === MessageType.AUDIENCE_SUPPORT;
  }

  /**
   * 是否为求援请求
   */
  isHelpRequest(): boolean {
    return this.message.message_type === MessageType.HELP_REQUEST;
  }

  /**
   * 转换为普通对象
   */
  toObject(): Message {
    return { ...this.message };
  }

  /**
   * 创建新消息
   */
  static async create(
    roundId: number,
    agentId: string,
    content: string,
    messageType: MessageType
  ): Promise<MessageModel> {
    const repository = new MessageRepository();

    const message = repository.create({
      round_id: roundId,
      agent_id: agentId,
      content,
      message_type: messageType,
      created_at: new Date().toISOString(),
    });

    logger.debug(`创建新消息`, {
      roundId,
      agentId,
      messageType,
      contentLength: content.length,
    });

    return new MessageModel(message);
  }

  /**
   * 批量创建消息
   */
  static async createBatch(
    messages: Array<{
      roundId: number;
      agentId: string;
      content: string;
      messageType: MessageType;
    }>
  ): Promise<MessageModel[]> {
    const repository = new MessageRepository();

    const messagesToCreate = messages.map(m => ({
      round_id: m.roundId,
      agent_id: m.agentId,
      content: m.content,
      message_type: m.messageType,
      created_at: new Date().toISOString(),
    }));

    const createdMessages = repository.createBatch(messagesToCreate);

    logger.info(`批量创建 ${createdMessages.length} 条消息`);

    return createdMessages.map(m => new MessageModel(m));
  }

  /**
   * 根据ID查找消息
   */
  static async findById(id: number): Promise<MessageModel | null> {
    const repository = new MessageRepository();
    const message = repository.findById(id);

    if (!message) {
      return null;
    }

    return new MessageModel(message);
  }

  /**
   * 获取回合的所有消息
   */
  static async findByRoundId(roundId: number): Promise<MessageModel[]> {
    const repository = new MessageRepository();
    const messages = repository.findByRoundId(roundId);

    return messages.map(message => new MessageModel(message));
  }

  /**
   * 获取指定Agent在回合中的消息
   */
  static async findByRoundAndAgent(
    roundId: number,
    agentId: string
  ): Promise<MessageModel[]> {
    const repository = new MessageRepository();
    const messages = repository.findByRoundAndAgent(roundId, agentId);

    return messages.map(message => new MessageModel(message));
  }
}

export default MessageModel;
