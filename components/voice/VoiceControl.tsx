'use client';

/**
 * VoiceControl 组件
 * Feature: 001-voice-emotion
 *
 * 紧凑的语音控制按钮组件
 * 用于在消息列表中显示播放按钮
 */

import React, { useState } from 'react';

export interface VoiceControlProps {
  messageId: number;
  text: string;
  audioUrl?: string;
  emotionType?: string;
  disabled?: boolean;
  loading?: boolean;
  playing?: boolean;
  onPlay?: (messageId: number) => void;
  onStop?: (messageId: number) => void;
}

export const VoiceControl: React.FC<VoiceControlProps> = ({
  messageId,
  text,
  audioUrl: _audioUrl,
  emotionType = 'neutral',
  disabled = false,
  loading = false,
  playing = false,
  onPlay,
  onStop,
}) => {
  const [isPlaying, setIsPlaying] = useState(playing);
  const [isHovered, setIsHovered] = useState(false);

  // 同步外部 playing 状态
  React.useEffect(() => {
    setIsPlaying(playing);
  }, [playing]);

  // 情绪类型对应的颜色
  const getEmotionColor = () => {
    switch (emotionType) {
      case 'intense':
        return 'bg-red-500';
      case 'calm':
        return 'bg-blue-500';
      case 'neutral':
      default:
        return 'bg-gray-500';
    }
  };

  const handleClick = () => {
    if (disabled || loading) return;

    if (isPlaying) {
      setIsPlaying(false);
      onStop?.(messageId);
    } else {
      setIsPlaying(true);
      onPlay?.(messageId);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative inline-flex items-center justify-center
        w-8 h-8 rounded-full
        transition-all duration-200
        ${disabled
          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
          : loading
            ? 'bg-gray-200 text-gray-400 cursor-wait'
            : isPlaying
              ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
              : `${getEmotionColor()} text-white hover:opacity-80 active:scale-95`
        }
      `}
      aria-label={isPlaying ? '停止播放' : '播放语音'}
      title={text}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
      ) : isPlaying ? (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="4" height="12" rx="1" />
          <rect x="14" y="6" width="4" height="12" rx="1" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}

      {/* 波动效果（播放时显示） */}
      {isPlaying && (
        <>
          <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping bg-blue-400" />
          <span className="absolute inline-flex h-full w-full rounded-full opacity-50 animate-pulse bg-blue-500" />
        </>
      )}

      {/* 悬停提示 */}
      {isHovered && !disabled && !loading && !isPlaying && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap z-10">
          {text.substring(0, 50)}{text.length > 50 ? '...' : ''}
        </div>
      )}
    </button>
  );
};
