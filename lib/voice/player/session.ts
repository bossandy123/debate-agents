/**
 * 播放会话管理
 * Feature: 001-voice-emotion
 *
 * 管理语音播放会话和状态
 * 用于 User Story 4 的连续播放功能
 */

import { AudioPlayer, PlaybackState } from './howler';

export interface VoiceMessage {
  messageId: number;
  audioUrl: string;
  text: string;
  duration?: number;
  emotionType?: string;
}

export interface PlaybackSession {
  id: string;
  messages: VoiceMessage[];
  currentIndex: number;
  repeatMode: 'none' | 'all' | 'one';
  shuffle: boolean;
  status: 'idle' | 'playing' | 'paused';
}

export class PlaybackSessionManager {
  private sessions: Map<string, PlaybackSession> = new Map();
  private currentPlayer: AudioPlayer | null = null;
  private currentSessionId: string | null = null;

  /**
   * 创建播放会话
   */
  createSession(
    id: string,
    messages: VoiceMessage[],
    options: {
      repeatMode?: 'none' | 'all' | 'one';
      shuffle?: boolean;
    } = {}
  ): PlaybackSession {
    const session: PlaybackSession = {
      id,
      messages: options.shuffle ? this.shuffleArray(messages) : messages,
      currentIndex: 0,
      repeatMode: options.repeatMode || 'none',
      shuffle: options.shuffle || false,
      status: 'idle',
    };

    this.sessions.set(id, session);
    console.log(`[PlaybackSession] Created session ${id} with ${messages.length} messages`);

    return session;
  }

  /**
   * 获取会话
   */
  getSession(id: string): PlaybackSession | undefined {
    return this.sessions.get(id);
  }

  /**
   * 开始播放会话
   */
  async playSession(
    sessionId: string,
    playMessage: (message: VoiceMessage) => Promise<void>
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    this.currentSessionId = sessionId;
    session.status = 'playing';

    const playNext = async () => {
      if (session.status !== 'playing') {
        return;
      }

      if (session.currentIndex >= session.messages.length) {
        // 检查重复模式
        if (session.repeatMode === 'all') {
          session.currentIndex = 0;
        } else {
          session.status = 'idle';
          return;
        }
      }

      const message = session.messages[session.currentIndex];
      await playMessage(message);

      session.currentIndex++;

      // 检查是否需要继续
      if (session.status === 'playing') {
        if (session.repeatMode === 'one') {
          session.currentIndex--;
        }

        if (session.currentIndex < session.messages.length || session.repeatMode === 'all') {
          // 等待当前音频播放完成后继续
          setTimeout(() => playNext(), 100);
        } else {
          session.status = 'idle';
        }
      }
    };

    await playNext();
  }

  /**
   * 暂停会话
   */
  pauseSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = 'paused';

    if (this.currentSessionId === sessionId && this.currentPlayer) {
      this.currentPlayer.pause();
    }

    console.log(`[PlaybackSession] Paused session ${sessionId}`);
  }

  /**
   * 恢复会话
   */
  resumeSession(
    sessionId: string,
    playMessage: (message: VoiceMessage) => Promise<void>
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'paused') {
      return;
    }

    session.status = 'playing';
    this.playSession(sessionId, playMessage);

    console.log(`[PlaybackSession] Resumed session ${sessionId}`);
  }

  /**
   * 停止会话
   */
  stopSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = 'idle';

    if (this.currentSessionId === sessionId && this.currentPlayer) {
      this.currentPlayer.stop();
    }

    console.log(`[PlaybackSession] Stopped session ${sessionId}`);
  }

  /**
   * 跳转到指定消息
   */
  skipTo(sessionId: string, messageIndex: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    if (messageIndex < 0 || messageIndex >= session.messages.length) {
      console.warn(`[PlaybackSession] Invalid message index: ${messageIndex}`);
      return;
    }

    // 停止当前播放
    if (this.currentSessionId === sessionId && this.currentPlayer) {
      this.currentPlayer.stop();
    }

    session.currentIndex = messageIndex;
    console.log(`[PlaybackSession] Skipped to message ${messageIndex} in session ${sessionId}`);
  }

  /**
   * 跳到下一首
   */
  skipNext(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const nextIndex = (session.currentIndex + 1) % session.messages.length;
    this.skipTo(sessionId, nextIndex);
  }

  /**
   * 跳到上一首
   */
  skipPrevious(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const prevIndex = session.currentIndex === 0
      ? session.messages.length - 1
      : session.currentIndex - 1;

    this.skipTo(sessionId, prevIndex);
  }

  /**
   * 删除会话
   */
  deleteSession(sessionId: string): void {
    this.stopSession(sessionId);
    this.sessions.delete(sessionId);

    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }

    console.log(`[PlaybackSession] Deleted session ${sessionId}`);
  }

  /**
   * 获取当前播放状态
   */
  getCurrentState(): {
    sessionId: string | null;
    status: 'idle' | 'playing' | 'paused';
    currentIndex: number;
    totalMessages: number;
    playerState: PlaybackState | null;
  } {
    const session = this.currentSessionId
      ? this.sessions.get(this.currentSessionId)
      : null;

    return {
      sessionId: this.currentSessionId,
      status: session?.status || 'idle',
      currentIndex: session?.currentIndex || 0,
      totalMessages: session?.messages.length || 0,
      playerState: this.currentPlayer?.getState() || null,
    };
  }

  /**
   * 设置当前播放器
   */
  setCurrentPlayer(player: AudioPlayer | null): void {
    this.currentPlayer = player;
  }

  /**
   * 清理所有会话
   */
  clear(): void {
    this.sessions.forEach((_, sessionId) => {
      this.stopSession(sessionId);
    });

    this.sessions.clear();
    this.currentSessionId = null;
    this.currentPlayer = null;

    console.log('[PlaybackSession] Cleared all sessions');
  }

  /**
   * 洗牌算法
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// 单例实例
let sessionManagerInstance: PlaybackSessionManager | null = null;

export function getPlaybackSessionManager(): PlaybackSessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new PlaybackSessionManager();
  }
  return sessionManagerInstance;
}
