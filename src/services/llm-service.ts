import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { logger } from '../utils/logger.js';
import { retryWithBackoff, isRetriableError } from '../utils/retry.js';
import { LLMProvider, AgentConfig } from '../types/index.js';

/**
 * LLM调用结果接口
 */
export interface LLMResponse {
  content: string;
  model: string;
  provider: LLMProvider;
  tokensUsed?: number;
}

/**
 * LLM统一抽象接口
 * 使用LangChain框架支持多个LLM提供商
 */
export class LLMService {
  private instances: Map<string, any> = new Map();

  /**
   * 获取或创建LLM实例
   */
  private getLLM(provider: LLMProvider, model: string, config: AgentConfig): any {
    const key = `${provider}:${model}`;

    if (this.instances.has(key)) {
      return this.instances.get(key);
    }

    let llm;

    switch (provider) {
      case LLMProvider.OPENAI:
        llm = new ChatOpenAI({
          modelName: model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          topP: config.topP,
          frequencyPenalty: config.frequencyPenalty,
          presencePenalty: config.presencePenalty,
          configuration: {
            baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
            apiKey: process.env.OPENAI_API_KEY,
          },
        });
        break;

      case LLMProvider.ANTHROPIC:
        llm = new ChatAnthropic({
          modelName: model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          topP: config.topP,
          clientOptions: {
            baseURL: process.env.ANTHROPIC_BASE_URL,
          },
        });
        break;

      case LLMProvider.GOOGLE_GENAI:
        llm = new ChatGoogleGenerativeAI({
          modelName: model,
          temperature: config.temperature,
          apiKey: process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY,
        });
        break;

      case LLMProvider.DEEPSEEK:
        // DeepSeek使用OpenAI兼容接口
        llm = new ChatOpenAI({
          modelName: model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          topP: config.topP,
          configuration: {
            baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
            apiKey: process.env.DEEPSEEK_API_KEY,
          },
        });
        break;

      default:
        throw new Error(`不支持的LLM提供商: ${provider}`);
    }

    this.instances.set(key, llm);
    logger.debug(`创建LLM实例`, { provider, model });
    return llm;
  }

  /**
   * 调用LLM生成回复
   * @param provider LLM提供商
   * @param model 模型名称
   * @param config Agent配置
   * @param prompt 提示词
   * @param systemPrompt 系统提示词（可选）
   * @returns LLM响应
   */
  async generate(
    provider: LLMProvider,
    model: string,
    config: AgentConfig,
    prompt: string,
    systemPrompt?: string
  ): Promise<LLMResponse> {
    return retryWithBackoff(async () => {
      try {
        const llm = this.getLLM(provider, model, config);

        const messages: any[] = [];

        if (systemPrompt) {
          messages.push(new SystemMessage(systemPrompt));
        }

        messages.push(new HumanMessage(prompt));

        const response = await llm.invoke(messages);

        let content = '';
        if (typeof response === 'string') {
          content = response;
        } else if (response instanceof AIMessage) {
          content = response.content.toString();
        } else {
          content = JSON.stringify(response);
        }

        logger.debug(`LLM调用成功`, { provider, model, contentLength: content.length });

        return {
          content,
          model,
          provider,
        };
      } catch (error) {
        const err = error as Error;
        logger.warn(`LLM调用失败，准备重试`, {
          provider,
          model,
          error: err.message,
        });

        // 检查是否可重试
        if (!isRetriableError(err)) {
          throw new Error(`LLM调用失败且不可重试: ${err.message}`);
        }

        throw err;
      }
    });
  }

  /**
   * 流式调用LLM
   * @param provider LLM提供商
   * @param model 模型名称
   * @param config Agent配置
   * @param prompt 提示词
   * @param systemPrompt 系统提示词（可选）
   * @param onToken token回调函数
   */
  async *generateStream(
    provider: LLMProvider,
    model: string,
    config: AgentConfig,
    prompt: string,
    systemPrompt: string | undefined,
    onToken: (token: string) => void
  ): AsyncGenerator<string, void, unknown> {
    const llm = this.getLLM(provider, model, config);

    const messages: any[] = [];

    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }

    messages.push(new HumanMessage(prompt));

    const stream = await llm.stream(messages);

    for await (const chunk of stream) {
      let token = '';
      if (typeof chunk === 'string') {
        token = chunk;
      } else if (chunk instanceof AIMessage) {
        token = chunk.content.toString();
      } else {
        token = JSON.stringify(chunk);
      }

      onToken(token);
      yield token;
    }
  }

  /**
   * 批量调用LLM
   */
  async generateBatch(
    requests: Array<{
      provider: LLMProvider;
      model: string;
      config: AgentConfig;
      prompt: string;
      systemPrompt?: string;
    }>
  ): Promise<LLMResponse[]> {
    // 使用Promise.all并行调用
    return Promise.all(
      requests.map(req => this.generate(req.provider, req.model, req.config, req.prompt, req.systemPrompt))
    );
  }

  /**
   * 清理缓存的LLM实例
   */
  clearCache(): void {
    this.instances.clear();
    logger.info('LLM实例缓存已清理');
  }
}

export default LLMService;
