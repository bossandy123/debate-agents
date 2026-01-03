/**
 * 播放会话详情 API
 * Feature: 001-voice-emotion
 *
 * PUT /api/voice/playback/session/[sessionId] - 更新播放会话
 * DELETE /api/voice/playback/session/[sessionId] - 删除播放会话
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { VoiceRepository } from '@/lib/repositories/voice.repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PUT /api/voice/playback/session/[sessionId]
 * 更新播放会话
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();

    // 验证 action 参数
    const { action, position } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Missing action parameter' },
        { status: 400 }
      );
    }

    if (!['play', 'pause', 'stop', 'seek', 'next', 'previous'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'action must be one of: play, pause, stop, seek, next, previous' },
        { status: 400 }
      );
    }

    const db = getDb();
    const repo = new VoiceRepository(db);

    // 获取现有会话
    const existing = repo.getPlaybackSessionBySessionId(sessionId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Playback session not found' },
        { status: 404 }
      );
    }

    // 准备更新数据
    const updates: Partial<{ status: 'idle' | 'playing' | 'paused' | 'stopped'; currentPosition: number; currentMessageId: number }> = {};

    switch (action) {
      case 'play':
        updates.status = 'playing';
        break;
      case 'pause':
        updates.status = 'paused';
        break;
      case 'stop':
        updates.status = 'stopped';
        updates.currentPosition = 0;
        break;
      case 'seek':
        if (position !== undefined) {
          updates.currentPosition = position;
        }
        break;
      case 'next':
        // 移动到下一条消息
        const currentIndex = existing.playlist.indexOf(existing.currentMessageId || 0);
        if (currentIndex !== -1 && currentIndex < existing.playlist.length - 1) {
          updates.currentMessageId = existing.playlist[currentIndex + 1];
        }
        break;
      case 'previous':
        // 移动到上一条消息
        const prevIndex = existing.playlist.indexOf(existing.currentMessageId || 0);
        if (prevIndex > 0) {
          updates.currentMessageId = existing.playlist[prevIndex - 1];
        }
        break;
    }

    // 更新会话
    const updated = repo.updatePlaybackSession(existing.id, updates);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update playback session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session: updated,
    });
  } catch (error) {
    console.error('[API] PUT /api/voice/playback/session/[sessionId] error:', error);
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
 * DELETE /api/voice/playback/session/[sessionId]
 * 删除播放会话
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const db = getDb();
    const repo = new VoiceRepository(db);

    // 检查会话是否存在
    const existing = repo.getPlaybackSessionBySessionId(sessionId);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Playback session not found' },
        { status: 404 }
      );
    }

    // 删除会话
    const deleted = repo.deletePlaybackSession(existing.id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete playback session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Playback session deleted successfully',
    });
  } catch (error) {
    console.error('[API] DELETE /api/voice/playback/session/[sessionId] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
