/**
 * 语音生成 API
 * Feature: 001-voice-emotion
 *
 * POST /api/voice/generate
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
 * 响应：
 * {
 *   "success": boolean,
 *   "cached": boolean,
 *   "audioUrl": string,
 *   "duration": number,
 *   "format": string,
 *   "generationTime": number,
 *   "error"?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { getVoiceService, VoiceGenerationRequest } from '@/lib/services/voice.service';
import { TTSProvider } from '@/lib/voice/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证请求参数
    const { messageId, text, agentId, emotion, provider } = body;

    if (typeof messageId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid messageId: must be a number' },
        { status: 400 }
      );
    }

    if (typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid text: must be a non-empty string' },
        { status: 400 }
      );
    }

    if (text.length > 10000) {
      return NextResponse.json(
        { success: false, error: 'Text too long: maximum 10000 characters' },
        { status: 400 }
      );
    }

    // 构建生成请求
    const generateRequest: VoiceGenerationRequest = {
      messageId,
      text: text.trim(),
      agentId,
      emotion,
      provider: provider as TTSProvider,
    };

    // 获取语音服务并生成
    const db = getDb();
    const voiceService = getVoiceService(db);
    const result = await voiceService.generateVoice(generateRequest);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[API] /api/voice/generate error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// 支持 GET 请求查询生成状态
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get('messageId');

  if (!messageId) {
    return NextResponse.json(
      { success: false, error: 'Missing messageId parameter' },
      { status: 400 }
    );
  }

  try {
    const db = getDb();
    const voiceService = getVoiceService(db);

    // 检查缓存中是否存在
    const cached = await voiceService.getCachedVoice(
      parseInt(messageId),
      '', // text 不用于查询
    );

    if (cached) {
      return NextResponse.json({
        success: true,
        cached: true,
        exists: true,
        audioUrl: cached.audioUrl,
        duration: cached.duration,
        format: cached.audioFormat,
      });
    }

    return NextResponse.json({
      success: true,
      exists: false,
    });

  } catch (error) {
    console.error('[API] /api/voice/generate GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
