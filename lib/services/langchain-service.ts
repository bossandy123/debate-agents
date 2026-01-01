/**
 * LangChain Service
 * Provides LangChain integration with streaming support for debate execution
 */

import { type LLMConfig, withRetry, DEFAULT_RETRY_CONFIG } from "@/lib/langchain/config";
import { sseService, type SSEEvent } from "@/lib/services/sse-service";
import { memoryService } from "@/lib/services/memory-service";

/**
 * 辩论阶段
 */
export type DebatePhase = "opening" | "rebuttal" | "closing";

/**
 * Chain 执行选项
 */
export interface ChainExecutionOptions {
  llmConfig: LLMConfig;
  streaming?: boolean;
  onToken?: (token: string) => void;
  debateId?: number;
}

/**
 * Chain 输入类型
 */
export type ChainInput = Record<string, unknown>;

/**
 * Chain 输出类型
 */
export type ChainOutput = Record<string, unknown> | string;

/**
 * Chain 函数类型
 */
export type ChainFunction<TInput = ChainInput, TOutput = ChainOutput> = (
  input: TInput
) => Promise<TOutput>;

/**
 * 流式 Chain 函数类型
 */
export type StreamChainFunction<TInput = ChainInput, TOutput = ChainOutput> = (
  input: TInput,
  onToken?: (token: string) => void
) => AsyncGenerator<TOutput>;

/**
 * LangChain Service
 * 提供 Chain 执行和流式传输功能
 */
class LangChainService {
  /**
   * 执行 Chain（非流式）
   */
  async invokeChain<TInput = ChainInput, TOutput = ChainOutput>(
    chain: ChainFunction<TInput, TOutput>,
    input: TInput,
    options?: ChainExecutionOptions
  ): Promise<TOutput> {
    const { llmConfig } = options ?? {};
    const maxRetries = llmConfig?.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries;

    return withRetry(async () => {
      return await chain(input);
    }, {
      maxRetries,
      onRetry: (error, attempt) => {
        console.error(`Chain retry attempt ${attempt}:`, error.message);
      },
    });
  }

  /**
   * 执行 Chain（流式）
   */
  async streamChain<TInput = ChainInput, TOutput = ChainOutput>(
    chain: StreamChainFunction<TInput, TOutput>,
    input: TInput,
    options?: ChainExecutionOptions
  ): Promise<TOutput> {
    const { debateId, llmConfig } = options ?? {};
    const maxRetries = llmConfig?.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries;

    return withRetry(async () => {
      let fullResult: TOutput | null = null;

      // 创建 token 回调，同时通过 SSE 广播
      const onToken = options?.onToken
        ? options.onToken
        : debateId
          ? (token: string) => {
              // 通过 SSE 广播 token
              sseService.broadcast(debateId, {
                type: "token",
                data: { token },
              });
            }
          : undefined;

      // 执行流式 Chain
      for await (const chunk of chain(input, onToken)) {
        fullResult = chunk;
      }

      return fullResult as TOutput;
    }, {
      maxRetries,
      onRetry: (error, attempt) => {
        console.error(`Stream chain retry attempt ${attempt}:`, error.message);
        if (debateId) {
          sseService.broadcast(debateId, {
            type: "error",
            data: {
              error: `流式输出重试中 (${attempt}/${maxRetries})...`,
              original_error: error.message,
            },
          });
        }
      },
    });
  }

  /**
   * 执行辩手发言（流式）
   */
  async streamDebaterSpeech(
    debateId: number,
    roundNumber: number,
    _agentId: string,
    stance: "pro" | "con",
    topic: string,
    proDefinition: string,
    conDefinition: string,
    maxRounds: number,
    llmConfig: LLMConfig,
    styleTag?: string
  ): Promise<{ content: string; tokenCount: number }> {
    // 获取对话历史
    const history = await memoryService.getConversationHistory(debateId, roundNumber - 1);

    // 导入 chain
    const { createStreamingDebaterChain } = await import("@/lib/agents/chains/debater-chain");
    const chain = createStreamingDebaterChain();

    // 通过流式 Chain 执行
    const result = await this.streamChain(
      chain.stream,
      {
        topic,
        pro_definition: proDefinition,
        con_definition: conDefinition,
        stance,
        roundNumber,
        maxRounds,
        conversationHistory: history,
        llmConfig,
        styleTag,
      },
      {
        llmConfig,
        streaming: true,
        debateId,
      }
    );

    const output = result as { content: string; tokenCount?: number };
    return {
      content: output.content,
      tokenCount: output.tokenCount || 0,
    };
  }

  /**
   * 执行裁判评分（非流式）
   */
  async executeJudgeScoring(
    _debateId: number,
    roundNumber: number,
    agentStance: string,
    agentContent: string,
    topic: string,
    maxRounds: number,
    llmConfig: LLMConfig
  ): Promise<{
    logic: number;
    rebuttal: number;
    clarity: number;
    evidence: number;
    comment: string;
    fouls?: string[];
  }> {
    // 导入 chain
    const { createJudgeScoringChain } = await import("@/lib/agents/chains/judge-chain");
    const chain = createJudgeScoringChain();

    return this.invokeChain(
      chain.execute,
      {
        topic,
        roundNumber,
        maxRounds,
        agentStance,
        agentContent,
        llmConfig,
      },
      { llmConfig }
    );
  }

  /**
   * 执行观众投票（非流式）
   */
  async executeAudienceVoting(
    _debateId: number,
    topic: string,
    proDefinition: string,
    conDefinition: string,
    proArguments: string,
    conArguments: string,
    proTotalScore: number,
    conTotalScore: number,
    audienceType: string,
    llmConfig: LLMConfig
  ): Promise<{ vote: "pro" | "con" | "draw"; confidence: number; reason: string }> {
    // 导入 chain
    const { createAudienceVotingChain } = await import("@/lib/agents/chains/audience-chain");
    const chain = createAudienceVotingChain();

    return this.invokeChain(
      chain.execute,
      {
        topic,
        proDefinition,
        conDefinition,
        proArguments,
        conArguments,
        proTotalScore,
        conTotalScore,
        audienceType,
        llmConfig,
      },
      { llmConfig }
    );
  }

  /**
   * 获取当前辩论阶段
   */
  getPhase(roundNumber: number, maxRounds: number): DebatePhase {
    return memoryService.getPhase(roundNumber, maxRounds);
  }

  /**
   * 执行观众申请审批
   */
  async executeAudienceApproval(
    _debateId: number,
    topic: string,
    roundNumber: number,
    maxRounds: number,
    requestId: number,
    audienceType: string,
    intent: string,
    claim: string,
    novelty: string,
    confidence: number,
    roundContext: string,
    llmConfig: LLMConfig
  ): Promise<{ approved: boolean; comment: string }> {
    // 导入 chain
    const { createAudienceApprovalChain } = await import("@/lib/agents/chains/judge-chain");
    const chain = createAudienceApprovalChain();

    return this.invokeChain(
      chain.execute,
      {
        topic,
        roundNumber,
        maxRounds,
        requestId,
        audienceType,
        intent,
        claim,
        novelty,
        confidence,
        roundContext,
        llmConfig,
      },
      { llmConfig }
    );
  }

  /**
   * 获取阶段对应的 Prompt 指令
   */
  getPhaseInstruction(phase: DebatePhase): string {
    const instructions: Record<DebatePhase, string> = {
      opening: "这是立论阶段，请清晰阐述你的核心论点和立场。",
      rebuttal: "这是反驳与论证阶段，请回应对方观点并进一步论证你的立场。",
      closing: "这是总结陈词阶段，请总结你的核心论点并进行最后陈述。",
    };
    return instructions[phase];
  }

  /**
   * 广播事件到 SSE
   */
  broadcast(debateId: number, eventType: SSEEvent["type"], data: unknown): void {
    sseService.broadcast(debateId, {
      type: eventType,
      data,
    });
  }
}

// 导出单例
export const langchainService = new LangChainService();
export default langchainService;
