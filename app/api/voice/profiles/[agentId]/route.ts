/**
 * Agent 语音配置 API
 * Feature: 001-voice-emotion
 *
 * GET /api/voice/profiles/[agentId] - 获取 Agent 语音配置
 * PUT /api/voice/profiles/[agentId] - 更新 Agent 语音配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { VoiceRepository } from '@/lib/repositories/voice.repository';
import { UpdateVoiceProfileDTO } from '@/lib/voice/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/voice/profiles/[agentId]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId: agentIdStr } = await params;
    const agentId = parseInt(agentIdStr);

    if (isNaN(agentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid agentId' },
        { status: 400 }
      );
    }

    const db = getDb();
    const repo = new VoiceRepository(db);
    const profile = repo.getVoiceProfileByAgentId(agentId);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Voice profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('[API] GET /api/voice/profiles/[agentId] error:', error);
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
 * PUT /api/voice/profiles/[agentId]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId: agentIdStr } = await params;
    const agentId = parseInt(agentIdStr);

    if (isNaN(agentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid agentId' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // 验证和构建 DTO
    const dto: UpdateVoiceProfileDTO = {};

    if (body.voiceName !== undefined) {
      if (typeof body.voiceName !== 'string') {
        return NextResponse.json(
          { success: false, error: 'voiceName must be a string' },
          { status: 400 }
        );
      }
      dto.voiceName = body.voiceName;
    }

    if (body.voiceGender !== undefined) {
      if (!['male', 'female'].includes(body.voiceGender)) {
        return NextResponse.json(
          { success: false, error: 'voiceGender must be male or female' },
          { status: 400 }
        );
      }
      dto.voiceGender = body.voiceGender;
    }

    if (body.voiceAge !== undefined) {
      if (!['young', 'middle', 'mature'].includes(body.voiceAge)) {
        return NextResponse.json(
          { success: false, error: 'voiceAge must be young, middle, or mature' },
          { status: 400 }
        );
      }
      dto.voiceAge = body.voiceAge;
    }

    if (body.basePitch !== undefined) {
      const pitch = parseFloat(body.basePitch);
      if (isNaN(pitch) || pitch < 0.5 || pitch > 2.0) {
        return NextResponse.json(
          { success: false, error: 'basePitch must be between 0.5 and 2.0' },
          { status: 400 }
        );
      }
      dto.basePitch = pitch;
    }

    if (body.baseSpeed !== undefined) {
      const speed = parseFloat(body.baseSpeed);
      if (isNaN(speed) || speed < 0.5 || speed > 2.0) {
        return NextResponse.json(
          { success: false, error: 'baseSpeed must be between 0.5 and 2.0' },
          { status: 400 }
        );
      }
      dto.baseSpeed = speed;
    }

    if (body.baseVolume !== undefined) {
      const volume = parseFloat(body.baseVolume);
      if (isNaN(volume) || volume < 0.0 || volume > 1.0) {
        return NextResponse.json(
          { success: false, error: 'baseVolume must be between 0.0 and 1.0' },
          { status: 400 }
        );
      }
      dto.baseVolume = volume;
    }

    if (body.ttsProvider !== undefined) {
      if (!['aliyun', 'doubao', 'tencent'].includes(body.ttsProvider)) {
        return NextResponse.json(
          { success: false, error: 'ttsProvider must be aliyun, doubao, or tencent' },
          { status: 400 }
        );
      }
      dto.ttsProvider = body.ttsProvider;
    }

    const db = getDb();
    const repo = new VoiceRepository(db);

    // 检查是否存在
    const existing = repo.getVoiceProfileByAgentId(agentId);
    if (!existing) {
      // 创建新配置
      const created = repo.createVoiceProfile({
        agentId,
        agentType: body.agentType || 'debater',
        ...dto,
      } as any);

      return NextResponse.json({
        success: true,
        profile: created,
      });
    }

    // 更新现有配置
    const updated = repo.updateVoiceProfile(existing.id, dto);

    return NextResponse.json({
      success: true,
      profile: updated,
    });
  } catch (error) {
    console.error('[API] PUT /api/voice/profiles/[agentId] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
