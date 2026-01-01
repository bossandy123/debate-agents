/**
 * Debater Chain
 * LangChain chain implementation for debater agents
 */

import { createLLM, type LLMConfig } from "@/lib/langchain/config";
import {
  getDebaterPromptByRound,
  formatConversationHistory,
} from "@/lib/agents/prompts/debater-prompts";

/**
 * 提取 LLM 响应的文本内容
 */
function extractContent(response: unknown): string {
  if (typeof response === "string") {
    return response;
  }
  if (typeof response === "object" && response !== null && "content" in response) {
    const content = (response as { content: unknown }).content;
    if (typeof content === "string") {
      return content;
    }
    if (Array.isArray(content)) {
      return content.map((c) => typeof c === "string" ? c : "").join("");
    }
  }
  return String(response);
}

/**
 * 辩手 Chain 输入
 */
export interface DebaterChainInput {
  topic: string;
  pro_definition: string;
  con_definition: string;
  stance: "pro" | "con";
  roundNumber: number;
  maxRounds: number;
  conversationHistory: Array<{
    role: string;
    stance?: string;
    content: string;
  }>;
  llmConfig: LLMConfig;
  styleTag?: string;
}

/**
 * 辩手 Chain 输出
 */
export interface DebaterChainOutput {
  content: string;
  stance: string;
  roundNumber: number;
  tokenCount?: number; // Token 数量（估算）
}

/**
 * 创建辩手 Chain
 */
export function createDebaterChain() {
  /**
   * 执行辩手发言
   */
  async function executeDebater(input: DebaterChainInput): Promise<DebaterChainOutput> {
    const {
      topic,
      pro_definition,
      con_definition,
      stance,
      roundNumber,
      maxRounds,
      conversationHistory,
      llmConfig,
      styleTag,
    } = input;

    // 获取对应轮次的 Prompt Template
    const promptTemplate = getDebaterPromptByRound(
      stance,
      roundNumber,
      maxRounds,
      styleTag
    );

    // 格式化对话历史
    const historyText = formatConversationHistory(conversationHistory);

    // 格式化输入
    const promptValues = {
      topic,
      pro_definition: pro_definition || "（正方未提供立场定义）",
      con_definition: con_definition || "（反方未提供立场定义）",
      current_round: roundNumber,
      max_rounds: maxRounds,
      conversation_history: historyText,
    };

    // 生成完整 Prompt
    const prompt = await promptTemplate.format(promptValues);

    // 创建 LLM 并生成回复
    const llm = createLLM(llmConfig);
    const response = await llm.invoke(prompt);

    const content = extractContent(response);

    return {
      content: content as string,
      stance,
      roundNumber,
    };
  }

  return {
    execute: executeDebater,
  };
}

/**
 * 创建流式辩手 Chain
 */
export function createStreamingDebaterChain() {
  /**
   * 执行流式辩手发言
   */
  async function* streamDebater(
    input: DebaterChainInput,
    onToken?: (token: string) => void
  ): AsyncGenerator<DebaterChainOutput> {
    const {
      topic,
      pro_definition,
      con_definition,
      stance,
      roundNumber,
      maxRounds,
      conversationHistory,
      llmConfig,
      styleTag,
    } = input;

    // 获取对应轮次的 Prompt Template
    const promptTemplate = getDebaterPromptByRound(
      stance,
      roundNumber,
      maxRounds,
      styleTag
    );

    // 格式化对话历史
    const historyText = formatConversationHistory(conversationHistory);

    // 格式化输入
    const promptValues = {
      topic,
      pro_definition: pro_definition || "（正方未提供立场定义）",
      con_definition: con_definition || "（反方未提供立场定义）",
      current_round: roundNumber,
      max_rounds: maxRounds,
      conversation_history: historyText,
    };

    // 生成完整 Prompt
    const prompt = await promptTemplate.format(promptValues);

    // 创建流式 LLM
    const llm = createLLM({ ...llmConfig, streaming: true });

    console.log(`[DebaterChain] 开始流式调用: model=${llmConfig.model}, provider=${llmConfig.provider}, baseURL=${llmConfig.baseURL || 'default'}`);

    let fullContent = "";
    let tokenCount = 0;
    const stream = await llm.stream([["human", prompt]]);

    for await (const chunk of stream) {
      const token = typeof chunk === "string" ? chunk : chunk.content;
      fullContent += token;
      tokenCount++; // 简单估算：每个 chunk 算一个 token
      if (onToken) {
        onToken(token as string);
      }
    }

    console.log(`[DebaterChain] 流式完成, tokenCount=${tokenCount}, contentLength=${fullContent.length}`);

    yield {
      content: fullContent,
      stance,
      roundNumber,
      tokenCount,
    };
  }

  return {
    stream: streamDebater,
  };
}

/**
 * 默认导出 - 非流式 Chain
 */
export default createDebaterChain();
