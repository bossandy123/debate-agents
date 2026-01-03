/**
 * 流式语音生成 API
 * Feature: 001-voice-emotion
 *
 * POST /api/voice/stream
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
 * - event: audio: 音频数据块 (base64)
 * - event: done: 生成完成
 * - event: error: 错误信息
 */

import { NextRequest } from 'next/server';
import { AliyunRealtimeTTS, StreamingCallbacks } from '@/lib/voice/tts/aliyun-realtime';
import { TTSOptions } from '@/lib/voice/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface StreamRequest {
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
        const body: StreamRequest = await request.json();

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

        // 获取语音配置
        // const voiceProfile = undefined;
        // if (agentId) {
        //   try {
        //     voiceProfile = await getVoiceProfileByAgentId(agentId);
        //   } catch (error) {
        //     console.error('[API] Failed to get voice profile:', error);
        //   }
        // }

        // 创建 TTS 选项
        const ttsOptions: TTSOptions = {
          text: text.trim(),
          voiceProfile: undefined,
          emotion: emotion as never,
        };

        // 创建回调
        const callbacks: StreamingCallbacks = {
          onAudioChunk: (audioData: ArrayBuffer) => {
            // 将音频数据转换为 base64
            const base64 = Buffer.from(audioData).toString('base64');
            console.log(`[API] Sending audio chunk: ${audioData.byteLength} bytes`);
            sendEvent('audio', {
              chunk: base64,
              size: audioData.byteLength,
              timestamp: Date.now(),
            });
          },
          onDone: () => {
            console.log('[API] Streaming done');
            sendEvent('done', { messageId, timestamp: Date.now() });
            controller.close();
          },
          onError: (error: Error) => {
            console.error('[API] Streaming error:', error);
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
        console.error('[API] /api/voice/stream error:', error);
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
