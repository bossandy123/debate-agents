/**
 * LangChain 模型配置
 * 提供 LLM 工厂函数和模型配置
 */

import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { getConfig } from "@/lib/utils/config";

/**
 * LLM 配置
 */
export interface LLMConfig {
  provider: "openai" | "anthropic" | "google" | "deepseek" | "custom";
  model: string;
  temperature?: number;
  streaming?: boolean;
  maxTokens?: number;
  maxRetries?: number;
  timeout?: number;
  apiKey?: string; // 自定义 API 密钥（覆盖默认配置）
  baseURL?: string; // 自定义 API 端点
}

/**
 * 默认重试配置
 */
export const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialRetryDelay: 1000, // 1 second
  maxRetryDelay: 10000, // 10 seconds
  retryBackoffMultiplier: 2,
};

/**
 * 默认超时配置
 */
export const DEFAULT_TIMEOUT = 60000; // 60 seconds

/**
 * 创建 LLM 实例
 */
export function createLLM(config: LLMConfig): BaseChatModel {
  const {
    provider,
    model,
    temperature = 0.7,
    streaming = true,
    maxTokens,
    maxRetries = DEFAULT_RETRY_CONFIG.maxRetries,
    timeout = DEFAULT_TIMEOUT,
    apiKey: customApiKey,
    baseURL: customBaseURL,
  } = config;

  const commonOptions = {
    temperature,
    streaming,
    maxRetries,
    timeout,
  };

  switch (provider) {
    case "openai": {
      const apiKey = customApiKey ?? getConfig().openaiApiKey;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured");
      }
      return new ChatOpenAI({
        modelName: model,
        maxTokens,
        openAIApiKey: apiKey,
        ...(customBaseURL && {
          configuration: {
            baseURL: customBaseURL,
          },
        }),
        // 添加 modelKwargs 以支持自定义模型名称
        modelKwargs: {},
        // 禁用详细日志以避免 token 计数警告
        verbose: false,
        ...commonOptions,
      });
    }

    case "anthropic": {
      const apiKey = customApiKey ?? getConfig().anthropicApiKey;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY is not configured");
      }
      return new ChatAnthropic({
        modelName: model,
        maxTokens,
        anthropicApiKey: apiKey,
        ...(customBaseURL && {
          clientOptions: {
            baseURL: customBaseURL,
          },
        }),
        verbose: false,
        ...commonOptions,
      });
    }

    case "google": {
      const apiKey = customApiKey ?? getConfig().googleApiKey;
      if (!apiKey) {
        throw new Error("GOOGLE_API_KEY is not configured");
      }
      return new ChatGoogleGenerativeAI({
        model,
        apiKey,
        verbose: false,
        ...commonOptions,
        ...(maxTokens !== undefined && { maxOutputTokens: maxTokens }),
      });
    }

    case "deepseek": {
      // DeepSeek uses OpenAI-compatible API
      const apiKey = customApiKey ?? getConfig().deepseekApiKey;
      if (!apiKey) {
        throw new Error("DEEPSEEK_API_KEY is not configured");
      }
      return new ChatOpenAI({
        modelName: model,
        maxTokens,
        openAIApiKey: apiKey,
        configuration: {
          baseURL: customBaseURL || "https://api.deepseek.com/v1",
        },
        // 添加 modelKwargs 以支持自定义模型名称
        modelKwargs: {},
        // 禁用详细日志
        verbose: false,
        ...commonOptions,
      });
    }

    case "custom": {
      // Custom provider - must have both apiKey and baseURL
      if (!customApiKey) {
        throw new Error("Custom provider requires apiKey");
      }
      if (!customBaseURL) {
        throw new Error("Custom provider requires baseURL");
      }
      // Use OpenAI-compatible interface for custom providers
      return new ChatOpenAI({
        modelName: model,
        maxTokens,
        openAIApiKey: customApiKey,
        configuration: {
          baseURL: customBaseURL,
        },
        // 添加 modelKwargs 以支持自定义模型
        modelKwargs: {},
        // 禁用详细日志
        verbose: false,
        ...commonOptions,
      });
    }

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * 预设的模型配置
 */
export const PRESET_MODELS: Record<
  string,
  Omit<LLMConfig, "temperature" | "streaming">
> = {
  // OpenAI
  "gpt-4": { provider: "openai", model: "gpt-4" },
  "gpt-4-turbo": { provider: "openai", model: "gpt-4-turbo-preview" },
  "gpt-3.5-turbo": { provider: "openai", model: "gpt-3.5-turbo" },

  // Anthropic
  "claude-3-opus": { provider: "anthropic", model: "claude-3-opus-20240229" },
  "claude-3-sonnet": { provider: "anthropic", model: "claude-3-sonnet-20240229" },
  "claude-3-haiku": { provider: "anthropic", model: "claude-3-haiku-20240307" },

  // Google
  "gemini-pro": { provider: "google", model: "gemini-pro" },
  "gemini-ultra": { provider: "google", model: "gemini-ultra" },

  // DeepSeek
  "deepseek-chat": { provider: "deepseek", model: "deepseek-chat" },
  "deepseek-coder": { provider: "deepseek", model: "deepseek-coder" },
};

/**
 * 可重试的错误类型
 */
export interface RetryableError extends Error {
  code?: string;
  status?: number;
}

/**
 * 判断错误是否可重试
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const retryableCodes = [
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ENOTFOUND",
    "EAI_AGAIN",
    "rate_limit_exceeded",
    "rate_limit_error",
    "too_many_requests",
    "timeout",
  ];

  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];

  const err = error as RetryableError;

  // Check error code
  if (err.code && retryableCodes.includes(err.code)) {
    return true;
  }

  // Check HTTP status
  if (err.status && retryableStatusCodes.includes(err.status)) {
    return true;
  }

  // Check error message
  const message = err.message.toLowerCase();
  const retryablePatterns = [
    "rate limit",
    "timeout",
    "connection",
    "network",
    "econnreset",
    "etimedout",
    "too many requests",
    "service unavailable",
    "temporarily unavailable",
  ];

  return retryablePatterns.some((pattern) => message.includes(pattern));
}

/**
 * 带重试的异步函数执行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialRetryDelay?: number;
    maxRetryDelay?: number;
    retryBackoffMultiplier?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_RETRY_CONFIG.maxRetries,
    initialRetryDelay = DEFAULT_RETRY_CONFIG.initialRetryDelay,
    maxRetryDelay = DEFAULT_RETRY_CONFIG.maxRetryDelay,
    retryBackoffMultiplier = DEFAULT_RETRY_CONFIG.retryBackoffMultiplier,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this is the last attempt or error is not retryable, throw
      if (attempt >= maxRetries || !isRetryableError(lastError)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialRetryDelay * Math.pow(retryBackoffMultiplier, attempt),
        maxRetryDelay
      );

      // Call onRetry callback
      if (onRetry) {
        onRetry(lastError, attempt + 1);
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

/**
 * 获取可用的模型列表
 */
export function getAvailableModels(): Array<{
  id: string;
  name: string;
  provider: string;
  requires: string[];
}> {
  const config = getConfig();

  return [
    {
      id: "gpt-4",
      name: "GPT-4",
      provider: "openai",
      requires: config.openaiApiKey ? [] : ["OPENAI_API_KEY"],
    },
    {
      id: "gpt-4-turbo",
      name: "GPT-4 Turbo",
      provider: "openai",
      requires: config.openaiApiKey ? [] : ["OPENAI_API_KEY"],
    },
    {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      provider: "openai",
      requires: config.openaiApiKey ? [] : ["OPENAI_API_KEY"],
    },
    {
      id: "claude-3-opus",
      name: "Claude 3 Opus",
      provider: "anthropic",
      requires: config.anthropicApiKey ? [] : ["ANTHROPIC_API_KEY"],
    },
    {
      id: "claude-3-sonnet",
      name: "Claude 3 Sonnet",
      provider: "anthropic",
      requires: config.anthropicApiKey ? [] : ["ANTHROPIC_API_KEY"],
    },
    {
      id: "claude-3-haiku",
      name: "Claude 3 Haiku",
      provider: "anthropic",
      requires: config.anthropicApiKey ? [] : ["ANTHROPIC_API_KEY"],
    },
    {
      id: "gemini-pro",
      name: "Gemini Pro",
      provider: "google",
      requires: config.googleApiKey ? [] : ["GOOGLE_API_KEY"],
    },
    {
      id: "deepseek-chat",
      name: "DeepSeek Chat",
      provider: "deepseek",
      requires: config.deepseekApiKey ? [] : ["DEEPSEEK_API_KEY"],
    },
  ];
}
