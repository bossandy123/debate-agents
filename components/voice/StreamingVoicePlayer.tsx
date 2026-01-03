/**
 * 流式语音播放器组件
 * Feature: 001-voice-emotion
 *
 * 实时接收并播放音频流，实现低延迟语音播放
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export interface StreamingVoicePlayerProps {
  text: string;
  agentId?: number;
  autoPlay?: boolean;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function StreamingVoicePlayer({
  text,
  agentId,
  autoPlay = false,
  onPlayStart,
  onPlayEnd,
  onError,
  className,
}: StreamingVoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingBufferRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 初始化 AudioContext
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // 播放音频队列
  const playQueue = async () => {
    // 如果已经在播放或队列为空，直接返回
    if (
      isPlayingBufferRef.current ||
      queueRef.current.length === 0 ||
      !audioContextRef.current
    ) {
      return;
    }

    isPlayingBufferRef.current = true;

    // 持续播放队列中的音频
    while (queueRef.current.length > 0 && isPlayingBufferRef.current) {
      const audioData = queueRef.current.shift()!;
      if (!audioContextRef.current) break;

      try {
        // 确保 AudioContext 处于运行状态
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        // 解码音频数据（WAV 格式）
        const audioBuffer = await audioContextRef.current.decodeAudioData(
          audioData.slice(0)
        );

        // 创建新的源节点
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;

        // 创建音量节点
        const gainNode = audioContextRef.current.createGain();
        const currentVolume = isMuted ? 0 : volume;
        gainNode.gain.value = currentVolume;

        // 连接节点
        source.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);

        // 保存当前源引用（用于停止）
        sourceNodeRef.current = source;

        // 播放
        source.start();

        // 等待播放完成
        await new Promise<void>((resolve) => {
          source.onended = () => {
            resolve();
          };
        });
      } catch (error) {
        // 忽略 AbortError，这是用户主动停止导致的
        if ((error as Error).name === 'AbortError') {
          console.debug('[StreamingVoicePlayer] Playback aborted by user');
          break;
        }
        console.error('[StreamingVoicePlayer] Failed to play audio chunk:', error);
      }
    }

    // 播放完成
    isPlayingBufferRef.current = false;

    // 检查是否还有新数据加入队列
    if (queueRef.current.length > 0) {
      // 有新数据，继续播放
      playQueue();
    } else {
      // 队列已空，播放结束
      setIsPlaying(false);
      onPlayEnd?.();
    }
  };

  // 开始流式播放
  const startStreaming = async () => {
    if (isLoading || isPlaying) return;

    setIsLoading(true);
    queueRef.current = [];
    isPlayingBufferRef.current = false;

    const audioContext = initAudioContext();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // 创建 AbortController
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/voice/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: Date.now(),
          text,
          agentId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      setIsLoading(false);
      setIsPlaying(true);
      onPlayStart?.();

      // 读取 SSE 流
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // 处理 SSE 消息
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          if (line.startsWith('event:')) {
            const event = line.substring(6).trim();

            // 获取下一行作为 data
            const nextLine = lines[++i]?.trim();
            if (nextLine?.startsWith('data:')) {
              const data = JSON.parse(nextLine.substring(5).trim());

              if (event === 'audio') {
                // 接收到音频数据块
                const audioData = Buffer.from(data.chunk, 'base64');
                queueRef.current.push(audioData.buffer);

                // 开始播放队列（如果还没开始）
                if (!isPlayingBufferRef.current) {
                  playQueue();
                }
              } else if (event === 'done') {
                // 服务器发送完成，但不立即结束状态
                // 等待队列中的音频播放完成
                // playQueue 函数会在队列空时调用 onPlayEnd
                break; // 退出读取循环
              } else if (event === 'error') {
                // 错误
                onError?.(data.error);
                setIsPlaying(false);
                isPlayingBufferRef.current = false; // 停止播放
              }
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('[StreamingVoicePlayer] Streaming error:', err);
        onError?.(err instanceof Error ? err.message : 'Unknown error');
      }
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  // 停止播放
  const stopPlayback = () => {
    // 首先中止流式请求
    abortControllerRef.current?.abort();

    // 停止播放队列
    isPlayingBufferRef.current = false;

    // 停止当前播放的音频源
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // 忽略 "node has already been stopped" 错误
        if ((e as Error).name !== 'AbortError') {
          console.debug('[StreamingVoicePlayer] Source stop error:', e);
        }
      }
      sourceNodeRef.current = null;
    }

    // 清空队列
    queueRef.current = [];

    // 更新状态
    setIsPlaying(false);
    setIsLoading(false);
  };

  // 切换播放/暂停
  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startStreaming();
    }
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // 自动播放
  useEffect(() => {
    if (autoPlay && text) {
      startStreaming();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, text]);

  // 切换静音
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // 调整音量
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (isMuted && newVolume > 0) {
      setIsMuted(false);
    }
  };

  return (
    <div
      className={clsx(
        'flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* 播放/暂停按钮 */}
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className={clsx(
          'flex items-center justify-center w-10 h-10 rounded-full transition-colors',
          isPlaying
            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-400'
            : 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900 dark:text-green-400',
          isLoading && 'opacity-50 cursor-not-allowed'
        )}
        title={isPlaying ? '停止播放' : '开始播放'}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </button>

      {/* 进度条 */}
      <div className="flex-1">
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full transition-all duration-300',
              isPlaying
                ? 'bg-blue-500 dark:bg-blue-400'
                : 'bg-green-500 dark:bg-green-400'
            )}
            style={{ width: isPlaying ? '100%' : '0%' }}
          />
        </div>
      </div>

      {/* 音量控制 */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMute}
          className="p-1.5 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          title={isMuted ? '取消静音' : '静音'}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-600 dark:[&::-webkit-slider-thumb]:bg-gray-400"
        />
      </div>

      {/* 状态标签 */}
      {isLoading && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          生成中...
        </span>
      )}
      {isPlaying && (
        <span className="text-xs text-blue-600 dark:text-blue-400">
          播放中
        </span>
      )}
    </div>
  );
}
