/**
 * SSE (Server-Sent Events) 服务
 * 用于实时推送辩论进度到前端
 */

export interface SSEEvent {
  type:
    | "connected"
    | "round_start"
    | "agent_start"
    | "token"
    | "agent_end"
    | "score_update"
    | "round_end"
    | "debate_end"
    | "error";
  data: unknown;
  timestamp: string;
}

type SSEListener = (event: SSEEvent) => void;

/**
 * SSE 服务单例
 * 管理所有辩论的 SSE 连接和事件推送
 */
class SSEService {
  private debates = new Map<number, Set<SSEListener>>();
  private debounceTimers = new Map<number, ReturnType<typeof setTimeout>>();

  /**
   * 订阅辩论事件
   * @param debateId 辩论 ID
   * @param listener 事件监听器
   * @returns 取消订阅函数
   */
  subscribe(debateId: number, listener: SSEListener): () => void {
    if (!this.debates.has(debateId)) {
      this.debates.set(debateId, new Set());
    }

    this.debates.get(debateId)!.add(listener);

    // 发送连接确认
    this.send(debateId, {
      type: "connected",
      data: { debate_id: debateId },
    });

    // 返回取消订阅函数
    return () => {
      const listeners = this.debates.get(debateId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.debates.delete(debateId);
        }
      }
    };
  }

  /**
   * 广播事件到指定辩论的所有订阅者
   * @param debateId 辩论 ID
   * @param event 事件（不含 timestamp）
   */
  broadcast(debateId: number, event: Omit<SSEEvent, "timestamp">): void {
    this.send(debateId, event);
  }

  /**
   * 发送事件到指定辩论的所有订阅者
   */
  private send(debateId: number, event: Omit<SSEEvent, "timestamp">): void {
    const listeners = this.debates.get(debateId);
    if (!listeners || listeners.size === 0) {
      return;
    }

    const fullEvent: SSEEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // 使用防抖，避免短时间内大量事件
    const timerKey = debateId;
    if (this.debounceTimers.has(timerKey)) {
      clearTimeout(this.debounceTimers.get(timerKey)!);
    }

    this.debounceTimers.set(
      timerKey,
      setTimeout(() => {
        for (const listener of listeners) {
          try {
            listener(fullEvent);
          } catch (error) {
            console.error("SSE listener error:", error);
          }
        }
        this.debounceTimers.delete(timerKey);
      }, 10) // 10ms 防抖
    );
  }

  /**
   * 获取活跃辩论数量
   */
  getActiveDebates(): number {
    return this.debates.size;
  }

  /**
   * 获取指定辩论的订阅者数量
   */
  getSubscriberCount(debateId: number): number {
    return this.debates.get(debateId)?.size ?? 0;
  }

  /**
   * 清理指定辩论的所有订阅
   */
  clearDebate(debateId: number): void {
    this.debates.delete(debateId);
    const timer = this.debounceTimers.get(debateId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(debateId);
    }
  }

  /**
   * 清理所有订阅
   */
  clearAll(): void {
    this.debates.clear();
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }
}

// 导出单例
export const sseService = new SSEService();

/**
 * 格式化 SSE 数据为 SSE 协议格式
 */
export function formatSSEData(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * 创建 SSE 流的 ReadableStream
 * 用于 Next.js API Route
 */
export function createSSEStream(
  subscribe: (listener: SSEListener) => () => void
): ReadableStream {
  let unsubscribe: () => void;

  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(formatSSEData(event)));
      };

      unsubscribe = subscribe(send);

      // 发送初始连接确认
      send({
        type: "connected",
        data: { message: "SSE connection established" },
        timestamp: new Date().toISOString(),
      });
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
      }
    },
  });
}
