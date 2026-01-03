/**
 * 播放会话 API
 * Feature: 001-voice-emotion
 *
 * POST /api/voice/playback/session - 创建播放会话
 * GET /api/voice/playback/session?sessionId=xxx - 获取播放会话
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { VoiceRepository } from '@/lib/repositories/voice.repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/voice/playback/session
 * 创建播放会话
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证请求参数
    const { debateId, userId, playlist, repeatMode, shuffle } = body;

    if (!debateId || !userId || !playlist) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: debateId, userId, playlist' },
        { status: 400 }
      );
    }

    if (!Array.isArray(playlist) || playlist.length === 0) {
      return NextResponse.json(
        { success: false, error: 'playlist must be a non-empty array of message IDs' },
        { status: 400 }
      );
    }

    if (repeatMode && !['none', 'all', 'one'].includes(repeatMode)) {
      return NextResponse.json(
        { success: false, error: 'repeatMode must be one of: none, all, one' },
        { status: 400 }
      );
    }

    // 生成唯一的 session ID
    const sessionId = `session-${debateId}-${userId}-${Date.now()}`;

    const db = getDb();
    const repo = new VoiceRepository(db);

    const session = repo.createPlaybackSession(
      sessionId,
      userId,
      debateId,
      playlist,
      repeatMode || 'none',
      shuffle || false
    );

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('[API] POST /api/voice/playback/session error:', error);
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
 * GET /api/voice/playback/session?sessionId=xxx
 * 获取播放会话
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const debateId = searchParams.get('debateId');
    const userId = searchParams.get('userId');

    if (!sessionId && (!debateId || !userId)) {
      return NextResponse.json(
        { success: false, error: 'Must provide either sessionId or (debateId + userId)' },
        { status: 400 }
      );
    }

    const db = getDb();
    const repo = new VoiceRepository(db);

    let session;

    if (sessionId) {
      session = repo.getPlaybackSessionBySessionId(sessionId);
    } else {
      // 通过 debateId 和 userId 查找最新的会话
      session = repo.getPlaybackSessionByDebateAndUser(
        parseInt(debateId!),
        userId!
      );
    }

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Playback session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('[API] GET /api/voice/playback/session error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
