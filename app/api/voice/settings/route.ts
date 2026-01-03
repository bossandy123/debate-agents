/**
 * 语音设置 API
 * Feature: 001-voice-emotion
 *
 * GET /api/voice/settings?userId=xxx - 获取用户语音设置
 * PUT /api/voice/settings - 更新用户语音设置
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { getVoiceService } from '@/lib/services/voice.service';
import { VoiceSettings } from '@/lib/voice/types';

/**
 * GET /api/voice/settings
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    const db = getDb();
    const voiceService = getVoiceService(db);

    let settings = voiceService.getVoiceSettings(userId);

    // 如果没有设置，初始化默认设置
    if (!settings) {
      settings = voiceService.initializeDefaultSettings(userId);
    }

    return NextResponse.json({
      success: true,
      settings,
    });

  } catch (error) {
    console.error('[API] GET /api/voice/settings error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/voice/settings
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 400 }
      );
    }

    // 验证设置参数
    const validatedSettings: Partial<VoiceSettings> = {};

    if (body.autoPlay !== undefined) {
      if (typeof body.autoPlay !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'autoPlay must be a boolean' },
          { status: 400 }
        );
      }
      validatedSettings.autoPlay = body.autoPlay;
    }

    if (body.defaultVolume !== undefined) {
      const volume = parseFloat(body.defaultVolume);
      if (isNaN(volume) || volume < 0 || volume > 1) {
        return NextResponse.json(
          { success: false, error: 'defaultVolume must be a number between 0 and 1' },
          { status: 400 }
        );
      }
      validatedSettings.defaultVolume = volume;
    }

    if (body.playbackSpeed !== undefined) {
      const speed = parseFloat(body.playbackSpeed);
      if (isNaN(speed) || speed < 0.5 || speed > 2) {
        return NextResponse.json(
          { success: false, error: 'playbackSpeed must be a number between 0.5 and 2' },
          { status: 400 }
        );
      }
      validatedSettings.playbackSpeed = speed;
    }

    if (body.voiceEnabled !== undefined) {
      if (typeof body.voiceEnabled !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'voiceEnabled must be a boolean' },
          { status: 400 }
        );
      }
      validatedSettings.voiceEnabled = body.voiceEnabled;
    }

    if (body.backgroundPlay !== undefined) {
      if (typeof body.backgroundPlay !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'backgroundPlay must be a boolean' },
          { status: 400 }
        );
      }
      validatedSettings.backgroundPlay = body.backgroundPlay;
    }

    if (body.autoAdvance !== undefined) {
      if (typeof body.autoAdvance !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'autoAdvance must be a boolean' },
          { status: 400 }
        );
      }
      validatedSettings.autoAdvance = body.autoAdvance;
    }

    if (body.preferredProvider !== undefined) {
      if (!['aliyun', 'doubao', 'tencent'].includes(body.preferredProvider)) {
        return NextResponse.json(
          { success: false, error: 'preferredProvider must be one of: aliyun, doubao, tencent' },
          { status: 400 }
        );
      }
      validatedSettings.preferredProvider = body.preferredProvider;
    }

    const db = getDb();
    const voiceService = getVoiceService(db);
    const updated = voiceService.updateVoiceSettings(userId, validatedSettings);

    return NextResponse.json({
      success: true,
      settings: updated,
    });

  } catch (error) {
    console.error('[API] PUT /api/voice/settings error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
