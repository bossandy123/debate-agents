import { LLMService } from '../services/llm-service.js';
import { ContextManager } from '../utils/context.js';
import { logger } from '../utils/logger.js';
import {
  Agent,
  AgentConfig,
  AgentRole,
  AgentStance,
  AudienceStyle,
  LLMProvider,
} from '../types/index.js';
import { BaseAgent } from './base.js';

/**
 * Agent工厂配置接口
 */
export interface AgentFactoryConfig {
  llmService: LLMService;
  contextManager: ContextManager;
}

/**
 * 辩手Agent创建选项
 */
export interface DebaterOptions {
  debateId: number;
  stance: AgentStance;
  provider: LLMProvider;
  model: string;
  config?: Partial<AgentConfig>;
}

/**
 * 裁判Agent创建选项
 */
export interface JudgeOptions {
  debateId: number;
  provider: LLMProvider;
  model: string;
  config?: Partial<AgentConfig>;
}

/**
 * 观众Agent创建选项
 */
export interface AudienceOptions {
  debateId: number;
  provider: LLMProvider;
  model: string;
  style: AudienceStyle;
  config?: Partial<AgentConfig>;
}

/**
 * 默认Agent配置
 */
const DEFAULT_CONFIG: AgentConfig = {
  temperature: 0.7,
  maxTokens: 2000,
  topP: 0.9,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
};

/**
 * 角色专用默认配置
 */
const ROLE_SPECIFIC_CONFIGS: Partial<Record<AgentRole, Partial<AgentConfig>>> = {
  [AgentRole.DEBATER]: {
    temperature: 0.8,
    maxTokens: 1500,
    topP: 0.9,
  },
  [AgentRole.JUDGE]: {
    temperature: 0.3,
    maxTokens: 3000,
    topP: 0.95,
  },
  [AgentRole.AUDIENCE]: {
    temperature: 0.7,
    maxTokens: 1000,
    topP: 0.85,
  },
};

/**
 * Agent工厂类
 * 负责创建和管理各种类型的Agent实例
 */
export class AgentFactory {
  private readonly llmService: LLMService;
  private readonly contextManager: ContextManager;
  private agentCounter: number = 0;

  constructor(config: AgentFactoryConfig) {
    this.llmService = config.llmService;
    this.contextManager = config.contextManager;
  }

  /**
   * 生成唯一Agent ID
   */
  private generateAgentId(role: AgentRole): string {
    this.agentCounter++;
    const timestamp = Date.now().toString(36);
    return `${role}_${timestamp}_${this.agentCounter}`;
  }

  /**
   * 合并默认配置和用户提供的配置
   */
  private mergeConfig(
    role: AgentRole,
    userConfig?: Partial<AgentConfig>
  ): AgentConfig {
    const roleConfig = ROLE_SPECIFIC_CONFIGS[role] || {};
    return {
      ...DEFAULT_CONFIG,
      ...roleConfig,
      ...userConfig,
    };
  }

  /**
   * 创建基础Agent对象
   */
  private createAgentEntity(
    role: AgentRole,
    debateId: number,
    provider: LLMProvider,
    model: string,
    config: AgentConfig,
    stance?: AgentStance,
    style?: AudienceStyle
  ): Agent {
    return {
      id: this.generateAgentId(role),
      debate_id: debateId,
      role,
      provider,
      model,
      stance,
      style_tag: style,
      config,
    };
  }

  /**
   * 创建辩手Agent
   */
  async createDebater(options: DebaterOptions): Promise<BaseAgent> {
    const config = this.mergeConfig(AgentRole.DEBATER, options.config);
    const agent = this.createAgentEntity(
      AgentRole.DEBATER,
      options.debateId,
      options.provider,
      options.model,
      config,
      options.stance
    );

    logger.info('创建辩手Agent', {
      agentId: agent.id,
      stance: options.stance,
      provider: options.provider,
      model: options.model,
    });

    // 动态导入并实例化DebaterAgent
    const { DebaterAgent } = await import('./debater.js');
    return new DebaterAgent(agent, this.llmService, this.contextManager);
  }

  /**
   * 创建正方辩手
   */
  async createProDebater(options: Omit<DebaterOptions, 'stance'>): Promise<BaseAgent> {
    return this.createDebater({ ...options, stance: AgentStance.PRO });
  }

  /**
   * 创建反方辩手
   */
  async createConDebater(options: Omit<DebaterOptions, 'stance'>): Promise<BaseAgent> {
    return this.createDebater({ ...options, stance: AgentStance.CON });
  }

  /**
   * 创建裁判Agent
   */
  async createJudge(options: JudgeOptions): Promise<BaseAgent> {
    const config = this.mergeConfig(AgentRole.JUDGE, options.config);
    const agent = this.createAgentEntity(
      AgentRole.JUDGE,
      options.debateId,
      options.provider,
      options.model,
      config
    );

    logger.info('创建裁判Agent', {
      agentId: agent.id,
      provider: options.provider,
      model: options.model,
    });

    // 动态导入并实例化JudgeAgent
    const { JudgeAgent } = await import('./judge.js');
    return new JudgeAgent(agent, this.llmService, this.contextManager);
  }

  /**
   * 创建观众Agent
   */
  async createAudience(options: AudienceOptions): Promise<BaseAgent> {
    const config = this.mergeConfig(AgentRole.AUDIENCE, options.config);
    const agent = this.createAgentEntity(
      AgentRole.AUDIENCE,
      options.debateId,
      options.provider,
      options.model,
      config,
      undefined,
      options.style
    );

    logger.info('创建观众Agent', {
      agentId: agent.id,
      style: options.style,
      provider: options.provider,
      model: options.model,
    });

    // 动态导入并实例化AudienceAgent
    const { AudienceAgent } = await import('./audience.js');
    return new AudienceAgent(agent, this.llmService, this.contextManager);
  }

  /**
   * 批量创建观众Agent
   */
  async createAudienceBatch(
    baseOptions: Omit<AudienceOptions, 'style'>,
    styles: AudienceStyle[]
  ): Promise<BaseAgent[]> {
    const agents: BaseAgent[] = [];

    for (const style of styles) {
      const agent = await this.createAudience({ ...baseOptions, style });
      agents.push(agent);
    }

    logger.info(`批量创建 ${agents.length} 个观众Agent`, {
      styles: styles.join(', '),
    });

    return agents;
  }

  /**
   * 创建完整的辩论Agent集合
   * 包括正反方辩手、裁判和指定数量的观众
   */
  async createDebateAgents(options: {
    debateId: number;
    proProvider: LLMProvider;
    proModel: string;
    conProvider: LLMProvider;
    conModel: string;
    judgeProvider: LLMProvider;
    judgeModel: string;
    audienceCount?: number;
    audienceProvider?: LLMProvider;
    audienceModel?: string;
  }): Promise<{
    proAgent: BaseAgent;
    conAgent: BaseAgent;
    judgeAgent: BaseAgent;
    audienceAgents: BaseAgent[];
  }> {
    // 创建辩手
    const proAgent = await this.createProDebater({
      debateId: options.debateId,
      provider: options.proProvider,
      model: options.proModel,
    });

    const conAgent = await this.createConDebater({
      debateId: options.debateId,
      provider: options.conProvider,
      model: options.conModel,
    });

    // 创建裁判
    const judgeAgent = await this.createJudge({
      debateId: options.debateId,
      provider: options.judgeProvider,
      model: options.judgeModel,
    });

    // 创建观众
    const audienceAgents: BaseAgent[] = [];
    const audienceCount = options.audienceCount ?? 0;
    const audienceProvider = options.audienceProvider ?? options.proProvider;
    const audienceModel = options.audienceModel ?? options.proModel;

    if (audienceCount > 0) {
      // 获取所有观众风格
      const audienceStyles = Object.values(AudienceStyle);

      // 确保不超过可用风格数量
      const actualCount = Math.min(audienceCount, audienceStyles.length);
      const selectedStyles = audienceStyles.slice(0, actualCount);

      const agents = await this.createAudienceBatch(
        {
          debateId: options.debateId,
          provider: audienceProvider,
          model: audienceModel,
        },
        selectedStyles
      );

      audienceAgents.push(...agents);
    }

    logger.info('创建辩论Agent集合完成', {
      debateId: options.debateId,
      proAgentId: proAgent.id,
      conAgentId: conAgent.id,
      judgeAgentId: judgeAgent.id,
      audienceCount: audienceAgents.length,
    });

    return {
      proAgent,
      conAgent,
      judgeAgent,
      audienceAgents,
    };
  }

  /**
   * 重置Agent计数器
   * 主要用于测试
   */
  resetCounter(): void {
    this.agentCounter = 0;
  }
}

export default AgentFactory;
