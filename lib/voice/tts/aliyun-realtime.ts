/**
 * 阿里云通义千问流式 TTS 实现
 * Feature: 001-voice-emotion
 *
 * 使用 WebSocket API 进行流式语音合成
 * 参考官方 Python 示例实现
 */

import { TTSOptions, TTSProvider } from '../types';
import WebSocket, { WebSocket as WebSocketInstance } from 'ws';

type WSConnection = WebSocketInstance;

interface WebSocketEvent {
  type: string;
  event_id?: string;
  session?: { id?: string };
  text?: string;
  delta?: string;
  error?: { message?: string };
  item_id?: string;
  response?: { id?: string };
  item?: { id?: string };
}

export interface StreamingCallbacks {
  onAudioChunk?: (audioData: ArrayBuffer) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

export class AliyunRealtimeTTS {
  private config: {
    apiKey: string;
    endpoint: string;
    model: string;
  };

  private currentCallbacks: StreamingCallbacks | null = null;
  private sessionFinishedResolver: (() => void) | null = null;
  private sessionUpdatedResolver: (() => void) | null = null;
  private audioDoneResolver: (() => void) | null = null; // 等待 audio.done 事件
  private activeResponseCount = 0; // 跟踪活跃的响应数量
  private contentPartCount = 0; // 跟踪 content part 数量

  constructor() {
    const apiKey = process.env.ALIYUN_API_KEY;

    if (!apiKey) {
      throw new Error('ALIYUN_API_KEY environment variable is not set');
    }

    this.config = {
      apiKey,
      endpoint: 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3-tts-flash-realtime',
      model: 'qwen3-tts-flash-realtime',
    };
  }

  getProvider(): TTSProvider {
    return 'aliyun';
  }

  /**
   * 流式合成语音
   */
  async synthesizeStreaming(
    options: TTSOptions,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    const { text } = options;

    const processedText = this.preprocessText(text);
    if (!processedText) {
      callbacks.onError?.(new Error('Text is empty after preprocessing'));
      return;
    }

    this.currentCallbacks = callbacks;
    this.activeResponseCount = 0;
    this.contentPartCount = 0;

    try {
      const ws = await this.connectWebSocket();

      // 等待 session.updated 确认
      const updateTimeout = setTimeout(() => {
        console.warn('[AliyunRealtimeTTS] No session.updated received, proceeding anyway');
        if (this.sessionUpdatedResolver) {
          this.sessionUpdatedResolver();
          this.sessionUpdatedResolver = null;
        }
      }, 5000); // 5秒超时

      console.log('[AliyunRealtimeTTS] Waiting for session.updated...');
      await this.waitForSessionUpdated();
      clearTimeout(updateTimeout);
      console.log('[AliyunRealtimeTTS] session.updated confirmed, proceeding with text');

      try {
        // 在 server_commit 模式下，服务端会智能处理文本分段
        // 我们一次性发送全部文本，但将文本长度控制在合理范围内
        // 已在 preprocessText 中限制最大 1000 字符
        console.log('[AliyunRealtimeTTS] Appending text:', processedText.substring(0, 100));
        await this.appendText(ws, processedText);
        console.log('[AliyunRealtimeTTS] Text appended, waiting for server to process...');

        // 等待音频生成完成（使用 audio.done 事件）
        await this.waitForAudioDone();
        console.log('[AliyunRealtimeTTS] Audio generation completed');

        // 等待一段时间，让所有音频数据都发送完毕
        // 根据观察，response.done 可能在 audio.done 之后很久才到来
        // 但音频数据会在 audio.done 后继续发送一段时间
        console.log('[AliyunRealtimeTTS] Waiting for audio data to flush...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // 等待 3 秒

        // 结束会话
        await this.finishSession(ws);
        console.log('[AliyunRealtimeTTS] Session finish command sent, waiting for confirmation...');

        // 等待会话结束确认（带超时）
        const sessionTimeout = setTimeout(() => {
          console.warn('[AliyunRealtimeTTS] Session timeout, forcing completion');
          if (this.sessionFinishedResolver) {
            this.sessionFinishedResolver();
            this.sessionFinishedResolver = null;
          }
        }, 5000); // 5秒超时

        await this.waitForSessionFinished();
        clearTimeout(sessionTimeout);
        console.log('[AliyunRealtimeTTS] Session finished confirmed');

        // 等待一小段时间确保所有消息都已处理
        await new Promise(resolve => setTimeout(resolve, 100));

        callbacks.onDone?.();
      } finally {
        console.log('[AliyunRealtimeTTS] Closing WebSocket connection');
        ws.close();
        this.currentCallbacks = null;
      }
    } catch (error) {
      console.error('[AliyunRealtimeTTS] Streaming synthesis failed:', error);
      callbacks.onError?.(
        error instanceof Error ? error : new Error('Unknown error')
      );
      this.currentCallbacks = null;
    }
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 发送事件
   */
  private async sendEvent(ws: WSConnection, event: Record<string, unknown>): Promise<void> {
    const eventType = event.type as string;
    const eventWithId = {
      ...event,
      event_id: this.generateEventId(),
    };
    console.log(`[AliyunRealtimeTTS] Sending event: type=${eventType}, event_id=${eventWithId.event_id}`);
    ws.send(JSON.stringify(eventWithId));
  }

  /**
   * 建立 WebSocket 连接
   */
  private async connectWebSocket(): Promise<WSConnection> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.config.endpoint, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      ws.on('open', () => {
        console.log('[AliyunRealtimeTTS] WebSocket connected');

        // 设置默认会话配置
        this.updateSession(ws, {
          mode: 'server_commit',
          voice: 'Maia',
          language_type: 'Auto',
          response_format: 'pcm',
          sample_rate: 24000,
        });

        // 立即 resolve，不等待
        // session.updated 事件会在消息处理器中异步处理
        resolve(ws);
      });

      ws.on('error', (error) => {
        console.error('[AliyunRealtimeTTS] WebSocket error:', error);
        reject(error);
      });

      ws.on('message', (data) => {
        // 忽略已经关闭连接后的消息
        if (ws.readyState !== WebSocket.OPEN) {
          console.warn('[AliyunRealtimeTTS] Received message but connection is not OPEN, state:', ws.readyState);
          return;
        }

        try {
          const event = JSON.parse(data.toString()) as WebSocketEvent;
          this.handleMessage(event);
        } catch (error) {
          console.error('[AliyunRealtimeTTS] Failed to parse message:', error);
        }
      });
    });
  }

  /**
   * 更新会话配置
   */
  private async updateSession(ws: WSConnection, config: Record<string, unknown>): Promise<void> {
    const event = {
      type: 'session.update',
      session: config,
    };
    console.log('[AliyunRealtimeTTS] Updating session:', event);
    await this.sendEvent(ws, event);
  }

  /**
   * 添加文本
   */
  private async appendText(ws: WSConnection, text: string): Promise<void> {
    const event = {
      type: 'input_text_buffer.append',
      text: text,
    };
    await this.sendEvent(ws, event);
  }

  /**
   * 结束会话
   */
  private async finishSession(ws: WSConnection): Promise<void> {
    const event = {
      type: 'session.finish',
    };
    await this.sendEvent(ws, event);
  }

  /**
   * 处理消息
   */
  private handleMessage(event: WebSocketEvent): void {
    const eventType = event.type;

    // 只记录关键事件，减少日志噪音
    if (eventType !== 'response.audio.delta' &&
        eventType !== 'response.audio.done' &&
        eventType !== 'response.content_part.done' &&
        eventType !== 'response.output_item.done') {
      console.log(`[AliyunRealtimeTTS] Received event: ${eventType}`);
    }

    switch (eventType) {
      case 'error':
        console.error('[AliyunRealtimeTTS] Error:', event.error);
        if (this.currentCallbacks?.onError) {
          this.currentCallbacks.onError(new Error(event.error?.message || 'Unknown error'));
        }
        break;

      case 'session.created':
        console.log('[AliyunRealtimeTTS] Session created, ID:', event.session?.id);
        break;

      case 'session.updated':
        console.log('[AliyunRealtimeTTS] Session updated, ID:', event.session?.id);
        if (this.sessionUpdatedResolver) {
          this.sessionUpdatedResolver();
          this.sessionUpdatedResolver = null;
        }
        break;

      case 'input_text_buffer.committed':
        break;

      case 'input_text_buffer.cleared':
        break;

      case 'response.created':
        this.activeResponseCount++;
        console.log('[AliyunRealtimeTTS] Response created, active count:', this.activeResponseCount);
        break;

      case 'response.output_item.added':
        console.log('[AliyunRealtimeTTS] Output item added');
        break;

      case 'response.content_part.added':
        this.contentPartCount++;
        console.log('[AliyunRealtimeTTS] Content part added, total:', this.contentPartCount);
        break;

      case 'response.content_part.done':
        console.log('[AliyunRealtimeTTS] Content part done');
        break;

      case 'response.output_item.done':
        console.log('[AliyunRealtimeTTS] Output item done');
        break;

      case 'response.audio.delta':
        if (event.delta) {
          const audioBytes = Buffer.from(event.delta, 'base64');
          console.log('[AliyunRealtimeTTS] Audio delta received:', audioBytes.length, 'bytes');
          if (this.currentCallbacks?.onAudioChunk) {
            this.currentCallbacks.onAudioChunk(audioBytes.buffer);
          } else {
            console.error('[AliyunRealtimeTTS] Audio delta received but no callback registered! This should not happen.');
            // 触发错误，因为回调应该已经设置
            if (this.currentCallbacks?.onError) {
              this.currentCallbacks.onError(new Error('Audio data received before callback was set up'));
            }
          }
        } else {
          console.warn('[AliyunRealtimeTTS] Audio delta received but delta is empty');
        }
        break;

      case 'response.audio.done':
        console.log('[AliyunRealtimeTTS] Audio generation done');
        // 打印统计信息
        console.log('[AliyunRealtimeTTS] Total content parts:', this.contentPartCount);
        console.log('[AliyunRealtimeTTS] Total active responses:', this.activeResponseCount);
        // 触发音频完成事件
        if (this.audioDoneResolver) {
          this.audioDoneResolver();
          this.audioDoneResolver = null;
        }
        break;

      case 'response.done':
        console.log('[AliyunRealtimeTTS] Response done');
        // response.done 事件不再需要处理，因为我们已经在 audio.done 时继续了
        break;

      case 'session.finished':
        console.log('[AliyunRealtimeTTS] Session finished');
        if (this.sessionFinishedResolver) {
          this.sessionFinishedResolver();
          this.sessionFinishedResolver = null;
        }
        break;

      default:
        console.log('[AliyunRealtimeTTS] Unhandled event type:', eventType);
        break;
    }
  }

  /**
   * 等待音频生成完成
   */
  private async waitForAudioDone(): Promise<void> {
    return new Promise((resolve) => {
      this.audioDoneResolver = resolve;
    });
  }

  /**
   * 等待会话结束
   */
  private async waitForSessionFinished(): Promise<void> {
    return new Promise((resolve) => {
      this.sessionFinishedResolver = resolve;
    });
  }

  /**
   * 等待会话更新确认
   */
  private async waitForSessionUpdated(): Promise<void> {
    return new Promise((resolve) => {
      this.sessionUpdatedResolver = resolve;
    });
  }

  /**
   * 预处理文本
   */
  private preprocessText(text: string): string {
    // 移除代码块
    let processed = text.replace(/```[\s\S]*?```/g, '[代码内容已跳过]');

    // 移除 LaTeX 公式
    processed = processed.replace(/\$\$[\s\S]*?\$\$/g, '[公式已跳过]');
    processed = processed.replace(/\$[^\$\n]*\$/g, '[公式已跳过]');

    // 移除图片链接
    processed = processed.replace(/!\[.*?\]\(.*?\)/g, '[图片]');

    // 移除 URL
    processed = processed.replace(/https?:\/\/([^\s]+)\/[^\s]*/g, '$1 的链接');

    processed = processed.trim();

    // 如果文本太长，截断以避免超时
    // 阿里云 WebSocket 有 300 秒超时限制
    // 假设平均语速为 150 字/分钟，保守估计 200 字/分钟
    // 300 秒 = 5 分钟 ≈ 1000 字
    const MAX_LENGTH = 1000;
    if (processed.length > MAX_LENGTH) {
      console.warn(`[AliyunRealtimeTTS] Text too long (${processed.length} chars), truncating to ${MAX_LENGTH}`);
      processed = processed.substring(0, MAX_LENGTH) + '...（后续内容已截断）';
    }

    return processed;
  }
}
