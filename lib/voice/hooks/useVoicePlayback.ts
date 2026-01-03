'use client';

/**
 * 语音播放 Hook
 * Feature: 001-voice-emotion
 *
 * 管理语音播放状态的 React Hook
 * 用于集成到辩论页面
 */

import { useState, useCallback, useRef } from 'react';

export interface VoicePlaybackState {
  playingMessageId: number | null;
  audioUrls: Map<number, string>;
  loading: Set<number>;
  errors: Map<number, string>;
}

export interface UseVoicePlaybackOptions {
  debateId: number;
  autoPlay?: boolean;
}

export function useVoicePlayback({ debateId: _debateId, autoPlay: _autoPlay = false }: UseVoicePlaybackOptions) {
  const [state, setState] = useState<VoicePlaybackState>({
    playingMessageId: null,
    audioUrls: new Map(),
    loading: new Set(),
    errors: new Map(),
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * 生成语音
   */
  const generateVoice = useCallback(async (messageId: number, text: string) => {
    // 检查缓存
    if (state.audioUrls.has(messageId)) {
      return state.audioUrls.get(messageId)!;
    }

    // 标记为加载中
    setState(prev => {
      const errors = new Map(prev.errors);
      errors.delete(messageId);
      return {
        ...prev,
        loading: new Set(prev.loading).add(messageId),
        errors,
      };
    });

    try {
      const response = await fetch('/api/voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          text,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate voice');
      }

      // 保存音频 URL
      setState(prev => {
        const audioUrls = new Map(prev.audioUrls);
        audioUrls.set(messageId, data.audioUrl);
        const loading = new Set(prev.loading);
        loading.delete(messageId);
        return { ...prev, audioUrls, loading };
      });

      return data.audioUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => {
        const errors = new Map(prev.errors);
        errors.set(messageId, errorMessage);
        const loading = new Set(prev.loading);
        loading.delete(messageId);
        return { ...prev, errors, loading };
      });
      throw error;
    }
  }, [state.audioUrls]);

  /**
   * 播放语音
   */
  const playVoice = useCallback(async (messageId: number, text: string) => {
    try {
      // 获取或生成音频 URL
      const audioUrl = await generateVoice(messageId, text);

      // 停止当前播放（先清理旧音频）
      if (audioRef.current) {
        const oldAudio = audioRef.current;
        audioRef.current = null;

        // 移除事件监听器，防止状态更新冲突
        oldAudio.onplay = null;
        oldAudio.onended = null;
        oldAudio.onerror = null;

        try {
          oldAudio.pause();
          oldAudio.currentTime = 0;
        } catch {
          // 忽略已停止的错误
        }
      }

      // 创建新的音频元素
      const audio = new Audio(audioUrl);

      // 设置事件处理器
      audio.onplay = () => {
        setState(prev => ({ ...prev, playingMessageId: messageId }));
      };

      audio.onended = () => {
        setState(prev => ({ ...prev, playingMessageId: null }));
        audioRef.current = null;
      };

      audio.onerror = (e) => {
        console.error('[useVoicePlayback] Audio error:', e);
        setState(prev => ({
          ...prev,
          playingMessageId: null,
          errors: new Map(prev.errors).set(messageId, 'Playback error'),
        }));
        audioRef.current = null;
      };

      // 保存引用
      audioRef.current = audio;

      // 开始播放（捕获 AbortError）
      try {
        await audio.play();
      } catch (playError) {
        // 如果是 AbortError，可能是用户快速切换导致的，静默忽略
        if ((playError as Error).name === 'AbortError') {
          console.debug('[useVoicePlayback] Play aborted, may be due to quick switch');
          return;
        }
        throw playError;
      }
    } catch (error) {
      console.error('Failed to play voice:', error);
      throw error;
    }
  }, [generateVoice]);

  /**
   * 停止播放
   */
  const stopVoice = useCallback(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      audioRef.current = null;

      // 移除事件监听器
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;

      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // 忽略已停止的错误
      }
    }

    setState(prev => ({ ...prev, playingMessageId: null }));
  }, []);

  /**
   * 切换播放/暂停
   */
  const toggleVoice = useCallback(async (messageId: number, text: string) => {
    if (state.playingMessageId === messageId) {
      stopVoice();
    } else {
      await playVoice(messageId, text);
    }
  }, [state.playingMessageId, playVoice, stopVoice]);

  /**
   * 清理资源
   */
  const cleanup = useCallback(() => {
    stopVoice();
    setState({
      playingMessageId: null,
      audioUrls: new Map(),
      loading: new Set(),
      errors: new Map(),
    });
  }, [stopVoice]);

  return {
    playingMessageId: state.playingMessageId,
    audioUrls: state.audioUrls,
    loading: state.loading,
    errors: state.errors,
    playVoice,
    stopVoice,
    toggleVoice,
    cleanup,
  };
}
