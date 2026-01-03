'use client';

/**
 * PlaybackControls 组件
 * Feature: 001-voice-emotion
 *
 * 语音历史回顾播放控制组件
 * 用于在复盘报告页面连续播放整场辩论
 */

import React, { useState, useEffect } from 'react';
import { PlaybackSession as PlaybackSessionType } from '@/lib/voice/types';

export interface VoiceMessage {
  messageId: number;
  text: string;
  audioUrl?: string;
}

export interface PlaybackControlsProps {
  debateId: number;
  userId: string;
  messages: VoiceMessage[];
  onMessageChange?: (messageId: number) => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  debateId,
  userId,
  messages,
  onMessageChange,
}) => {
  const [session, setSession] = useState<PlaybackSessionType | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载或创建播放会话
  useEffect(() => {
    loadOrCreateSession();
  }, [debateId, userId]);

  const loadOrCreateSession = async () => {
    setLoading(true);
    setError(null);

    try {
      // 尝试获取现有会话
      const response = await fetch(
        `/api/voice/playback/session?debateId=${debateId}&userId=${encodeURIComponent(userId)}`
      );
      const data = await response.json();

      if (data.success && data.session) {
        setSession(data.session);
        const currentMsgId = data.session.currentMessageId;
        const idx = currentMsgId ? data.session.playlist.indexOf(currentMsgId) : 0;
        setCurrentIndex(idx >= 0 ? idx : 0);
        setIsPlaying(data.session.status === 'playing');
      } else if (messages.length > 0) {
        // 创建新会话
        await createSession();
      }
    } catch (err) {
      console.error('[PlaybackControls] Failed to load session:', err);
      setError('加载播放会话失败');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    setLoading(true);
    setError(null);

    try {
      const playlist = messages.map((m) => m.messageId);

      const response = await fetch('/api/voice/playback/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debateId,
          userId,
          playlist,
          repeatMode: 'none',
          shuffle: false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSession(data.session);
        setCurrentIndex(0);
      } else {
        setError(data.error || '创建播放会话失败');
      }
    } catch (err) {
      console.error('[PlaybackControls] Failed to create session:', err);
      setError('创建播放会话失败');
    } finally {
      setLoading(false);
    }
  };

  const updateSession = async (action: 'play' | 'pause' | 'stop' | 'next' | 'previous') => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/voice/playback/session/${session.sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (data.success) {
        const updatedSession = data.session;
        setSession(updatedSession);
        setIsPlaying(updatedSession.status === 'playing');

        // 更新当前索引
        const currentMsgId = updatedSession.currentMessageId;
        const newIndex = currentMsgId ? updatedSession.playlist.indexOf(currentMsgId) : currentIndex;
        if (newIndex !== -1) {
          setCurrentIndex(newIndex);
          onMessageChange?.(currentMsgId || messages[newIndex]?.messageId || 0);
        }
      } else {
        setError(data.error || '更新播放状态失败');
      }
    } catch (err) {
      console.error('[PlaybackControls] Failed to update session:', err);
      setError('更新播放状态失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      updateSession('pause');
    } else {
      updateSession('play');
    }
  };

  const handleStop = () => {
    updateSession('stop');
  };

  const handleNext = () => {
    updateSession('next');
  };

  const handlePrevious = () => {
    updateSession('previous');
  };

  const handlePlayAll = async () => {
    if (!session && messages.length > 0) {
      await createSession();
    }
    updateSession('play');
  };

  // 获取当前消息
  const currentMessage = messages[currentIndex];
  const progress = messages.length > 0 ? ((currentIndex + 1) / messages.length) * 100 : 0;

  if (loading && !session) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
          语音回顾播放
        </h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Error display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Play All Button */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
              连续播放整场辩论
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              共 {messages.length} 条发言
            </p>
          </div>
          <button
            onClick={handlePlayAll}
            disabled={loading || messages.length === 0}
            className={`
              px-6 py-3 rounded-lg font-medium transition-all
              ${loading || messages.length === 0
                ? 'bg-gray-300 dark:bg-slate-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 active:scale-95 shadow-md'
              }
            `}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                加载中
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                播放整场
              </span>
            )}
          </button>
        </div>

        {/* Progress Bar */}
        {messages.length > 0 && (
          <div>
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-slate-400 mb-2">
              <span>当前: 第 {currentIndex + 1} 条</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Current Message Display */}
        {currentMessage && (
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
              当前播放 ({currentIndex + 1}/{messages.length})
            </p>
            <p className="text-sm text-gray-700 dark:text-slate-300 line-clamp-2">
              {currentMessage.text}
            </p>
          </div>
        )}

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Previous */}
          <button
            onClick={handlePrevious}
            disabled={loading || !session || currentIndex === 0}
            className={`
              p-3 rounded-full transition-all
              ${loading || !session || currentIndex === 0
                ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600'
              }
            `}
            aria-label="上一条"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            disabled={loading || !session}
            className={`
              p-4 rounded-full transition-all shadow-lg
              ${loading || !session
                ? 'bg-gray-300 dark:bg-slate-700 text-gray-500 cursor-not-allowed'
                : isPlaying
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }
            `}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Stop */}
          <button
            onClick={handleStop}
            disabled={loading || !session || !isPlaying}
            className={`
              p-3 rounded-full transition-all
              ${loading || !session || !isPlaying
                ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600'
              }
            `}
            aria-label="停止"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z" />
            </svg>
          </button>

          {/* Next */}
          <button
            onClick={handleNext}
            disabled={loading || !session || currentIndex >= messages.length - 1}
            className={`
              p-3 rounded-full transition-all
              ${loading || !session || currentIndex >= messages.length - 1
                ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600'
              }
            `}
            aria-label="下一条"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
