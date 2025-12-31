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
  provider: "openai" | "anthropic" | "google" | "deepseek";
  model: string;
  temperature?: number;
  streaming?: boolean;
  maxTokens?: number;
}

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
  } = config;

  switch (provider) {
    case "openai": {
      const apiKey = getConfig().openaiApiKey;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured");
      }
      return new ChatOpenAI({
        modelName: model,
        temperature,
        streaming,
        maxTokens,
        openAIApiKey: apiKey,
      });
    }

    case "anthropic": {
      const apiKey = getConfig().anthropicApiKey;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY is not configured");
      }
      return new ChatAnthropic({
        modelName: model,
        temperature,
        streaming,
        maxTokens,
        anthropicApiKey: apiKey,
      });
    }

    case "google": {
      const apiKey = getConfig().googleApiKey;
      if (!apiKey) {
        throw new Error("GOOGLE_API_KEY is not configured");
      }
      return new ChatGoogleGenerativeAI({
        model,
        temperature,
        streaming,
        apiKey,
        ...(maxTokens !== undefined && { maxOutputTokens: maxTokens }),
      });
    }

    case "deepseek": {
      // DeepSeek uses OpenAI-compatible API
      const apiKey = getConfig().deepseekApiKey;
      if (!apiKey) {
        throw new Error("DEEPSEEK_API_KEY is not configured");
      }
      return new ChatOpenAI({
        modelName: model,
        temperature,
        streaming,
        maxTokens,
        openAIApiKey: apiKey,
        configuration: {
          baseURL: "https://api.deepseek.com/v1",
        },
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
