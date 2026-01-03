/**
 * 语音缓存查询 API
 * Feature: 001-voice-emotion
 *
 * GET /api/voice/cache/[messageId]
 *
 * 响应：
 * {
 *   "success": boolean,
 *   "cached": boolean,
 *   "audioUrl"?: string,
 *   "duration"?: number,
 *   "format"?: string,
 *   "emotionType"?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { getVoiceService } from '@/lib/services/voice.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId: messageIdStr } = await params;
    const messageId = parseInt(messageIdStr);

    if (isNaN(messageId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid messageId' },
        { status: 400 }
      );
    }

    const db = getDb();
    const voiceService = getVoiceService(db);

    // 查询缓存（需要 text 参数，这里通过 searchParams 获取）
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text') || '';
    const emotion = searchParams.get('emotion') || undefined;

    const cached = await voiceService.getCachedVoice(messageId, text, emotion);

    if (cached) {
      return NextResponse.json({
        success: true,
        cached: true,
        audioUrl: cached.audioUrl,
        duration: cached.duration,
        format: cached.audioFormat,
        emotionType: cached.emotionType,
        emotionIntensity: cached.emotionIntensity,
      });
    }

    return NextResponse.json({
      success: true,
      cached: false,
    });

  } catch (error) {
    const { messageId: messageIdStr } = await params;
    console.error(`[API] /api/voice/cache/${messageIdStr} error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
