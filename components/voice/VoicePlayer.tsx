'use client';

/**
 * VoicePlayer 组件
 * Feature: 001-voice-emotion
 *
 * 完整的语音播放器组件
 * 包含播放控制、进度条、音量控制
 */

import React, { useState, useRef, useEffect } from 'react';
import { AudioPlayer, PlaybackState } from '@/lib/voice/player/howler';

export interface VoicePlayerProps {
  audioUrl: string;
  messageId: number;
  text?: string;
  autoPlay?: boolean;
  initialVolume?: number;
  emotionType?: 'intense' | 'neutral' | 'calm';
  emotionIntensity?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({
  audioUrl,
  messageId,
  text,
  autoPlay = false,
  initialVolume = 0.8,
  emotionType = 'neutral',
  emotionIntensity = 0.5,
  onPlay,
  onPause,
  onEnd,
  onError,
}) => {
  const playerRef = useRef<AudioPlayer | null>(null);
  const [state, setState] = useState<PlaybackState>({
    playing: false,
    paused: false,
    ended: false,
    loading: true,
    error: false,
    duration: 0,
    position: 0,
    volume: initialVolume,
    rate: 1.0,
  });

  // 初始化播放器
  useEffect(() => {
    const player = new AudioPlayer();
    player.load({
      src: audioUrl,
      volume: initialVolume,
      autoplay: autoPlay,
      html5: true,
      onplay: () => {
        setState(prev => ({ ...prev, playing: true, paused: false }));
        onPlay?.();
      },
      onpause: () => {
        setState(prev => ({ ...prev, playing: false, paused: true }));
        onPause?.();
      },
      onend: () => {
        setState(prev => ({ ...prev, playing: false, ended: true }));
        onEnd?.();
      },
      onerror: (error) => {
        setState(prev => ({ ...prev, error: true, loading: false }));
        onError?.(error);
      },
    });

    playerRef.current = player;

    // 定时更新状态
    const interval = setInterval(() => {
      if (player.isPlaying()) {
        setState(player.getState());
      }
    }, 100);

    return () => {
      clearInterval(interval);
      player.dispose();
    };
  }, [audioUrl, messageId]);

  // 播放/暂停切换（添加防抖处理）
  const togglePlayPause = () => {
    if (!playerRef.current) return;

    // 使用实际播放状态而不是缓存的状态
    const isCurrentlyPlaying = playerRef.current.isPlaying();

    if (isCurrentlyPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  };

  // 更新播放位置
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!playerRef.current) return;

    const newPosition = parseFloat(e.target.value);
    playerRef.current.seek(newPosition);
    setState(prev => ({ ...prev, position: newPosition }));
  };

  // 更新音量
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!playerRef.current) return;

    const newVolume = parseFloat(e.target.value);
    playerRef.current.setVolume(newVolume);
    setState(prev => ({ ...prev, volume: newVolume }));
  };

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 播放进度百分比
  const progressPercent = state.duration > 0
    ? (state.position / state.duration) * 100
    : 0;

  // 情绪类型对应的颜色和标签
  const getEmotionInfo = () => {
    switch (emotionType) {
      case 'intense':
        return { color: 'bg-red-500', label: '激烈', textColor: 'text-red-600' };
      case 'calm':
        return { color: 'bg-blue-500', label: '从容', textColor: 'text-blue-600' };
      case 'neutral':
      default:
        return { color: 'bg-gray-500', label: '中立', textColor: 'text-gray-600' };
    }
  };

  const emotionInfo = getEmotionInfo();

  return (
    <div className="voice-player bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* 播放控制 */}
      <div className="flex items-center gap-4">
        {/* 播放/暂停按钮 */}
        <button
          onClick={togglePlayPause}
          disabled={state.loading || state.error}
          className={`
            flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-200
            ${state.loading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : state.error
                ? 'bg-red-100 text-red-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
            }
          `}
          aria-label={state.playing ? '暂停' : '播放'}
        >
          {state.loading ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : state.playing ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* 进度条 */}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-mono w-10">
              {formatTime(state.position)}
            </span>

            <div className="flex-1 relative">
              <input
                type="range"
                min="0"
                max={state.duration || 0}
                step="0.1"
                value={state.position}
                onChange={handleSeek}
                disabled={state.loading || state.error}
                className={`
                  w-full h-2 rounded-lg appearance-none cursor-pointer
                  ${state.loading || state.error
                    ? 'bg-gray-200 cursor-not-allowed'
                    : 'bg-gray-200 hover:bg-gray-300'
                  }
                `}
                style={{
                  background: `linear-gradient(to right, #3b82f6 ${progressPercent}%, #e5e7eb ${progressPercent}%)`,
                }}
              />
            </div>

            <span className="text-xs text-gray-500 font-mono w-10 text-right">
              {formatTime(state.duration)}
            </span>
          </div>
        </div>

        {/* 音量控制 */}
        <div className="flex items-center gap-2 w-32">
          <button
            onClick={() => {
              if (playerRef.current) {
                const newVolume = state.volume > 0 ? 0 : initialVolume;
                playerRef.current.setVolume(newVolume);
                setState(prev => ({ ...prev, volume: newVolume }));
              }
            }}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="静音/取消静音"
          >
            {state.volume === 0 ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={state.volume}
            onChange={handleVolumeChange}
            className="w-20 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 hover:bg-gray-300"
            style={{
              background: `linear-gradient(to right, #3b82f6 ${state.volume * 100}%, #e5e7eb ${state.volume * 100}%)`,
            }}
            aria-label="音量"
          />
        </div>
      </div>

      {/* 状态提示 */}
      {state.error && (
        <div className="mt-3 text-sm text-red-500 flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>音频加载失败</span>
        </div>
      )}

      {/* 情绪显示 */}
      {emotionType !== 'neutral' && (
        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${emotionInfo.textColor} bg-gray-50 border border-gray-200`}>
            <span className={`w-2 h-2 rounded-full ${emotionInfo.color}`}></span>
            <span>{emotionInfo.label}</span>
            {emotionIntensity > 0 && (
              <span className="text-gray-400">({Math.round(emotionIntensity * 100)}%)</span>
            )}
          </span>
        </div>
      )}

      {text && (
        <div className="mt-3 text-sm text-gray-600 line-clamp-2">
          {text}
        </div>
      )}
    </div>
  );
};
