/**
 * 语音生成 API - 流式响应
 * Feature: 001-voice-emotion
 *
 * POST /api/voice/generate
 *
 * 使用 Server-Sent Events (SSE) 实时推送音频数据块
 *
 * 请求体：
 * {
 *   "messageId": number,
 *   "text": string,
 *   "agentId"?: number,
 *   "emotion"?: EmotionAnalysisResult,
 *   "provider"?: TTSProvider
 * }
 *
 * SSE 事件类型：
 * - event: start: 开始生成
 * - event: audio: 音频数据块 (base64)
 * - event: done: 生成完成
 * - event: error: 错误信息
 */

import { NextRequest } from 'next/server';
import { AliyunRealtimeTTS, StreamingCallbacks } from '@/lib/voice/tts';
import { TTSOptions } from '@/lib/voice/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateRequest {
  messageId: number;
  text: string;
  agentId?: number;
  emotion?: unknown;
  provider?: string;
}

export async function POST(request: NextRequest) {
  // 创建 SSE 流
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // 解析请求
        const body: GenerateRequest = await request.json();

        // 验证参数
        if (typeof body.messageId !== 'number') {
          sendEvent('error', { error: 'Invalid messageId: must be a number' });
          controller.close();
          return;
        }

        if (typeof body.text !== 'string' || body.text.trim().length === 0) {
          sendEvent('error', { error: 'Invalid text: must be a non-empty string' });
          controller.close();
          return;
        }

        const { messageId, text, emotion } = body;

        // 发送开始事件
        sendEvent('start', { messageId, timestamp: Date.now() });

        // 创建 TTS 选项
        const ttsOptions: TTSOptions = {
          text: text.trim(),
          voiceProfile: undefined,
          emotion: emotion as never,
        };

        // 音频块缓冲区 - 积累多个小块后一次性发送
        const chunkBuffer: Uint8Array[] = [];
        const BUFFER_SIZE_THRESHOLD = 10 * 1024; // 10KB 缓冲区阈值（降低延迟）
        const BUFFER_TIME_THRESHOLD = 50; // 50ms 时间阈值（降低延迟）
        let lastFlushTime = Date.now();
        let totalBufferSize = 0;
        let totalChunksReceived = 0;
        let totalBytesReceived = 0;

        const flushBuffer = () => {
          if (chunkBuffer.length === 0) return;

          // 合并所有缓冲的音频块
          const totalLength = chunkBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
          const mergedBuffer = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunkBuffer) {
            mergedBuffer.set(chunk, offset);
            offset += chunk.length;
          }

          // 转换为 base64 并发送
          const base64 = Buffer.from(mergedBuffer.buffer).toString('base64');
          console.log(`[API] Flushing ${chunkBuffer.length} chunks, total: ${totalLength} bytes`);
          sendEvent('audio', {
            chunk: base64,
            size: totalLength,
            timestamp: Date.now(),
          });

          // 清空缓冲区
          chunkBuffer.length = 0;
          totalBufferSize = 0;
          lastFlushTime = Date.now();
        };

        // 创建回调
        const callbacks: StreamingCallbacks = {
          onAudioChunk: (audioData: ArrayBuffer) => {
            // 将音频数据添加到缓冲区
            const chunk = new Uint8Array(audioData);
            chunkBuffer.push(chunk);
            totalBufferSize += chunk.length;

            // 统计
            totalChunksReceived++;
            totalBytesReceived += chunk.length;

            const now = Date.now();
            const shouldFlush =
              totalBufferSize >= BUFFER_SIZE_THRESHOLD ||
              (now - lastFlushTime) >= BUFFER_TIME_THRESHOLD;

            if (shouldFlush) {
              flushBuffer();
            }
          },
          onDone: () => {
            console.log('[API] Streaming done');
            console.log(`[API] Total audio received: ${totalChunksReceived} chunks, ${totalBytesReceived} bytes`);
            // 刷新剩余缓冲区
            flushBuffer();
            sendEvent('done', { messageId, timestamp: Date.now() });
            controller.close();
          },
          onError: (error: Error) => {
            console.error('[API] Streaming error:', error);
            // 刷新剩余缓冲区
            flushBuffer();
            sendEvent('error', {
              error: error.message,
              messageId,
              timestamp: Date.now(),
            });
            controller.close();
          },
        };

        console.log(`[API] Starting streaming TTS for text length: ${text.length}`);

        // 使用 AliyunRealtimeTTS 进行流式合成
        const tts = new AliyunRealtimeTTS();
        await tts.synthesizeStreaming(ttsOptions, callbacks);

      } catch (error) {
        console.error('[API] /api/voice/generate error:', error);
        sendEvent('error', {
          error: error instanceof Error ? error.message : 'Internal server error',
          timestamp: Date.now(),
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
    },
  });
}

// OPTIONS 请求支持（用于 CORS）
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
