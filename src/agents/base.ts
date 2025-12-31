import { LLMService } from '../services/llm-service.js';
import { ContextManager } from '../utils/context.js';
import { logger } from '../utils/logger.js';
import {
  Agent,
  AgentConfig,
  AgentRole,
  AgentStance,
  LLMProvider,
  MessageType,
  RoundPhase,
} from '../types/index.js';

/**
 * Agent执行结果接口
 */
export interface AgentResult {
  content: string;
  messageType: MessageType;
  metadata?: Record<string, unknown>;
}

/**
 * Agent执行上下文接口
 */
export interface AgentExecutionContext {
  debateId: number;
  roundNum: number;
  phase: RoundPhase;
  topic: string;
  allMessages: Array<{
    agent_id: string;
    content: string;
    message_type: MessageType;
    round_id: number;
  }>;
}

/**
 * Agent基类
 * 所有Agent（辩手、裁判、观众）的抽象基类
 */
export abstract class BaseAgent {
  protected readonly llmService: LLMService;
  protected readonly contextManager: ContextManager;
  protected readonly agent: Agent;

  constructor(agent: Agent, llmService: LLMService, contextManager: ContextManager) {
    this.agent = agent;
    this.llmService = llmService;
    this.contextManager = contextManager;
  }

  /**
   * 获取Agent ID
   */
  get id(): string {
    return this.agent.id;
  }

  /**
   * 获取Agent角色
   */
  get role(): AgentRole {
    return this.agent.role;
  }

  /**
   * 获取Agent立场（仅辩手有）
   */
  get stance(): AgentStance | undefined {
    return this.agent.stance;
  }

  /**
   * 获取LLM提供商
   */
  get provider(): LLMProvider {
    return this.agent.provider;
  }

  /**
   * 获取模型名称
   */
  get model(): string {
    return this.agent.model;
  }

  /**
   * 获取Agent配置
   */
  get config(): AgentConfig {
    return this.agent.config;
  }

  /**
   * 执行Agent的主要逻辑
   * 子类必须实现此方法
   */
  abstract execute(context: AgentExecutionContext): Promise<AgentResult>;

  /**
   * 构建系统提示词
   * 子类可以重写此方法以提供特定角色的系统提示
   */
  protected buildSystemPrompt(): string {
    const basePrompt = this.contextManager.formatSystemPrompt(
      this.getRoleName(),
      this.agent.stance
    );

    return this.addRoleSpecificInstructions(basePrompt);
  }

  /**
   * 获取角色名称（中文）
   */
  protected getRoleName(): string {
    switch (this.agent.role) {
      case AgentRole.DEBATER:
        return '辩手';
      case AgentRole.JUDGE:
        return '裁判';
      case AgentRole.AUDIENCE:
        return '观众';
      default:
        return '参与者';
    }
  }

  /**
   * 添加角色特定指令
   * 子类可以重写此方法以添加特定指令
   */
  protected addRoleSpecificInstructions(basePrompt: string): string {
    return basePrompt;
  }

  /**
   * 构建用户提示词
   * 基于上下文信息生成用户提示
   */
  protected buildUserPrompt(context: AgentExecutionContext): string {
    const contextStr = this.buildContextString(context);
    const roundPrompt = this.contextManager.formatRoundPrompt(
      context.roundNum,
      context.phase,
      context.topic
    );

    return `${roundPrompt}\n\n${contextStr}\n\n请${this.getActionInstruction()}`;
  }

  /**
   * 构建上下文字符串
   */
  protected buildContextString(context: AgentExecutionContext): string {
    // 根据Agent角色选择不同的上下文构建策略
    if (this.agent.role === AgentRole.JUDGE) {
      // 裁判需要完整历史
      return this.contextManager.buildJudgeContext(
        context.allMessages as any,
        context.roundNum
      );
    }

    // 辩手和观众使用压缩上下文
    return this.contextManager.buildContext(
      context.roundNum,
      context.allMessages as any
    );
  }

  /**
   * 获取行动指令
   * 子类应重写此方法以提供特定角色的行动指令
   */
  protected getActionInstruction(): string {
    return '根据当前辩论状态，发表你的观点。';
  }

  /**
   * 调用LLM生成回复
   */
  protected async callLLM(userPrompt: string): Promise<string> {
    const systemPrompt = this.buildSystemPrompt();

    logger.debug(`${this.id} 调用LLM`, {
      provider: this.agent.provider,
      model: this.agent.model,
      promptLength: userPrompt.length,
    });

    const response = await this.llmService.generate(
      this.agent.provider,
      this.agent.model,
      this.agent.config,
      userPrompt,
      systemPrompt
    );

    logger.debug(`${this.id} LLM响应`, {
      contentLength: response.content.length,
      model: response.model,
    });

    return response.content;
  }

  /**
   * 验证生成内容的合法性
   * 子类可以重写此方法以添加特定验证逻辑
   */
  protected validateContent(content: string): boolean {
    if (!content || content.trim().length === 0) {
      logger.warn(`${this.id} 生成内容为空`);
      return false;
    }

    // 检查内容长度是否合理
    if (content.length > 10000) {
      logger.warn(`${this.id} 生成内容过长`, { length: content.length });
      return false;
    }

    return true;
  }

  /**
   * 后处理生成内容
   * 子类可以重写此方法以添加特定后处理逻辑
   */
  protected postProcessContent(content: string): string {
    return content.trim();
  }

  /**
   * 执行Agent逻辑（带验证和后处理）
   */
  async executeWithValidation(context: AgentExecutionContext): Promise<AgentResult> {
    try {
      // 调用子类实现的execute方法
      const result = await this.execute(context);

      // 验证内容
      if (!this.validateContent(result.content)) {
        throw new Error(`生成内容验证失败: ${result.content.slice(0, 100)}...`);
      }

      // 后处理
      const processedContent = this.postProcessContent(result.content);

      logger.info(`${this.id} 执行完成`, {
        debateId: context.debateId,
        roundNum: context.roundNum,
        contentLength: processedContent.length,
        messageType: result.messageType,
      });

      return {
        content: processedContent,
        messageType: result.messageType,
        metadata: result.metadata,
      };
    } catch (error) {
      logger.error(`${this.id} 执行失败`, {
        debateId: context.debateId,
        roundNum: context.roundNum,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}

export default BaseAgent;
