/**
 * LangChain 回调配置
 * 用于 LangSmith 追踪和自定义回调
 */

import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { getConfig } from "@/lib/utils/config";

/**
 * LangSmith 追踪回调
 * 如果配置了 LANGCHAIN_API_KEY，则启用 LangSmith 追踪
 */
export function getLangChainCallbacks(): BaseCallbackHandler[] {
  const config = getConfig();

  if (!config.langchainTracingV2 || !config.langchainApiKey) {
    return [];
  }

  // LangSmith tracing is handled via environment variables
  // No explicit callback handler needed for basic tracing
  // Just ensure environment variables are set:
  // - LANGCHAIN_TRACING_V2=true
  // - LANGCHAIN_API_KEY=your_key
  // - LANGCHAIN_PROJECT=your_project_name

  return [];
}

/**
 * SSE 自定义回调
 * 用于将 LangChain Chain 的输出实时推送到 SSE
 */
export class SSECallback extends BaseCallbackHandler {
  name = "sse_callback";

  private sendEvent: (event: { type: string; data: unknown }) => void;

  constructor(sendEvent: (event: { type: string; data: unknown }) => void) {
    super();
    this.sendEvent = sendEvent;
  }

  handleLLMNewToken(token: string): void {
    this.sendEvent({
      type: "token",
      data: { token },
    });
  }

  handleLLMEnd(): void {
    this.sendEvent({
      type: "llm_end",
      data: {},
    });
  }
}

/**
 * 创建 SSE 回调实例
 */
export function createSSECallback(
  sendEvent: (event: { type: string; data: unknown }) => void
): SSECallback {
  return new SSECallback(sendEvent);
}
