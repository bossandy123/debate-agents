'use client';

/**
 * 语音播放 Hook - 流式播放版
 * Feature: 001-voice-emotion
 *
 * 使用 Web Audio API 实现边接收边播放
 */

import { useState, useCallback, useRef } from 'react';

/**
 * 流式音频播放器类
 * 使用 Web Audio API 实现边接收边播放
 *
 * 改进版：使用预调度机制，确保音频块之间无缝衔接
 */
class StreamingAudioPlayer {
  private audioContext: AudioContext;
  private sampleRate: number;
  private queue: AudioBuffer[] = [];
  private isPlaying = false;
  private scheduledSources: AudioBufferSourceNode[] = [];
  private nextStartTime: number = 0;
  private onEndCallback?: () => void;
  private isStreamFinished = false;
  private hasScheduledEndCheck = false;

  constructor(sampleRate: number = 24000, onEnd?: () => void) {
    this.sampleRate = sampleRate;
    this.audioContext = new AudioContext({ sampleRate });
    this.onEndCallback = onEnd;
  }

  /**
   * 添加音频数据块到播放队列
   */
  addChunk(pcmData: ArrayBuffer): void {
    const audioBuffer = this.audioContext.createBuffer(
      1, // 单声道
      pcmData.byteLength / 2, // 16-bit PCM，每 2 字节一个样本
      this.sampleRate
    );

    // 将 PCM 数据填充到 AudioBuffer
    const channelData = audioBuffer.getChannelData(0);
    const view = new Int16Array(pcmData);
    for (let i = 0; i < view.length; i++) {
      // 将 16-bit PCM 转换为 [-1, 1] 范围的浮点数
      channelData[i] = view[i] / 32768.0;
    }

    this.queue.push(audioBuffer);
    console.log('[StreamingAudioPlayer] Chunk added, queue size:', this.queue.length, ', buffer duration:', audioBuffer.duration.toFixed(3));

    // 如果还没开始播放，立即开始
    if (!this.isPlaying) {
      this.startPlaying();
    } else {
      // 如果已经在播放，尝试调度新的音频块
      // 重要：即使流已结束，也要尝试调度（防止竞态条件）
      this.scheduleChunks();
    }
  }

  /**
   * 标记流已结束（所有数据已接收完毕）
   */
  markStreamFinished(): void {
    this.isStreamFinished = true;
    // 立即尝试调度剩余的音频块
    this.scheduleChunks();
  }

  /**
   * 开始播放
   */
  private startPlaying(): void {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.nextStartTime = this.audioContext.currentTime;
    this.scheduleChunks();
  }

  /**
   * 调度待播放的音频块
   * 关键改进：一次性调度所有可用的音频块，而不是在 onended 中调度
   */
  private scheduleChunks(): void {
    console.log('[StreamingAudioPlayer] scheduleChunks called, queue length:', this.queue.length, 'isStreamFinished:', this.isStreamFinished);

    // 调度队列中所有可用的音频块
    while (this.queue.length > 0) {
      const buffer = this.queue.shift()!;
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);

      // 设置播放结束回调
      source.onended = () => {
        console.log('[StreamingAudioPlayer] Audio chunk ended, scheduled sources remaining:', this.scheduledSources.length - 1);
        // 从已调度的源列表中移除
        const index = this.scheduledSources.indexOf(source);
        if (index > -1) {
          this.scheduledSources.splice(index, 1);
        }

        // 检查是否所有音频都已播放完毕
        this.checkPlaybackEnded();
      };

      // 记录已调度的源
      this.scheduledSources.push(source);

      // 计算调度时间点
      const currentTime = this.audioContext.currentTime;
      if (this.nextStartTime === 0) {
        // 第一次调度，从当前时间开始
        this.nextStartTime = currentTime;
      }

      // 如果调度时间已经过了，立即播放（避免断流）
      if (this.nextStartTime < currentTime) {
        console.warn('[StreamingAudioPlayer] Scheduling time in the past, adjusting to current time');
        this.nextStartTime = currentTime;
      }

      console.log('[StreamingAudioPlayer] Scheduling chunk at time:', this.nextStartTime.toFixed(3), ', duration:', buffer.duration.toFixed(3));

      // 开始播放
      source.start(this.nextStartTime);
      this.nextStartTime += buffer.duration;
    }

    // 如果流已结束且队列已空，安排最终的结束检查
    if (this.isStreamFinished && this.queue.length === 0 && !this.hasScheduledEndCheck) {
      this.hasScheduledEndCheck = true;
      const timeUntilEnd = (this.nextStartTime - this.audioContext.currentTime) * 1000 + 500;
      console.log('[StreamingAudioPlayer] Scheduling end check in', timeUntilEnd.toFixed(0), 'ms');

      // 延迟检查，确保所有已调度的音频都已开始播放
      setTimeout(() => {
        console.log('[StreamingAudioPlayer] End check timeout triggered');
        this.checkPlaybackEnded();
      }, Math.max(100, timeUntilEnd));
    }
  }

  /**
   * 检查播放是否结束
   */
  private checkPlaybackEnded(): void {
    if (!this.isPlaying) return;

    console.log('[StreamingAudioPlayer] checkPlaybackEnded - isStreamFinished:', this.isStreamFinished, ', queue:', this.queue.length, ', scheduledSources:', this.scheduledSources.length);

    // 只有在以下条件都满足时才认为播放结束：
    // 1. 流已结束
    // 2. 队列为空
    // 3. 所有已调度的音频源都已播放完毕
    if (this.isStreamFinished &&
        this.queue.length === 0 &&
        this.scheduledSources.length === 0) {
      console.log('[StreamingAudioPlayer] All conditions met, triggering end');
      this.triggerEnd();
    }
  }

  /**
   * 触发播放结束
   */
  private triggerEnd(): void {
    if (this.isPlaying) {
      this.isPlaying = false;
      this.nextStartTime = 0;
      this.onEndCallback?.();
    }
  }

  /**
   * 停止播放
   */
  stop(): void {
    // 停止所有已调度的音频源
    for (const source of this.scheduledSources) {
      try {
        source.stop();
      } catch {
        // 忽略已经停止的错误
      }
    }
    this.scheduledSources = [];

    this.isPlaying = false;
    this.queue = [];
    this.nextStartTime = 0;
    this.isStreamFinished = false;
    this.hasScheduledEndCheck = false;
  }

  /**
   * 关闭音频上下文
   */
  close(): void {
    this.stop();
    this.audioContext.close();
  }
}

export interface VoicePlaybackState {
  playingMessageId: number | null;
  loading: Set<number>;
}

export function useVoicePlayback() {
  const [state, setState] = useState<VoicePlaybackState>({
    playingMessageId: null,
    loading: new Set(),
  });

  const playerRef = useRef<StreamingAudioPlayer | null>(null);

  /**
   * 播放语音 - 流式播放
   */
  const playVoice = useCallback(async (messageId: number, text: string) => {
    // text 参数保留以备将来使用
    void text;
    // 停止当前播放
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current.close();
      playerRef.current = null;
    }

    // 标记为加载中
    setState(prev => ({
      ...prev,
      playingMessageId: messageId,
      loading: new Set(prev.loading).add(messageId),
    }));

    try {
      // 调用流式生成 API
      const response = await fetch('/api/voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, text }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate voice');
      }

      // 创建流式播放器
      const player = new StreamingAudioPlayer(24000, () => {
        console.log('[useVoicePlayback] Playback ended');
        setState(prev => ({
          ...prev,
          playingMessageId: null,
        }));
        if (playerRef.current) {
          playerRef.current.close();
          playerRef.current = null;
        }
      });
      playerRef.current = player;

      // 读取 SSE 流
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let currentEvent = '';
      let buffer = '';
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 按行分割，但保留最后一个可能不完整的行
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith('event: ')) {
            currentEvent = trimmedLine.slice(7).trim();
          } else if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));

              if (currentEvent === 'audio' && data.chunk) {
                // 将 base64 音频数据转换为 ArrayBuffer
                const binaryString = atob(data.chunk);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }

                // 直接将 PCM 数据添加到播放器
                player.addChunk(bytes.buffer);
                chunkCount++;
                console.log('[useVoicePlayback] Added chunk', chunkCount, ':', bytes.length, 'bytes');
              } else if (currentEvent === 'done') {
                console.log('[useVoicePlayback] Streaming completed, total chunks:', chunkCount);
                // 标记流已结束，让播放器知道不会再有新数据
                player.markStreamFinished();
                setState(prev => {
                  const loading = new Set(prev.loading);
                  loading.delete(messageId);
                  return { ...prev, loading };
                });
              } else if (currentEvent === 'error') {
                console.error('[useVoicePlayback] Server error:', data.error);
                throw new Error(data.error || 'Unknown error');
              } else if (currentEvent === 'start') {
                console.log('[useVoicePlayback] Streaming started');
              }
            } catch (e) {
              console.error('[useVoicePlayback] Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to play voice:', error);
      if (playerRef.current) {
        playerRef.current.close();
        playerRef.current = null;
      }
      setState(prev => {
        const loading = new Set(prev.loading);
        loading.delete(messageId);
        return {
          ...prev,
          playingMessageId: null,
          loading,
        };
      });
    }
  }, []);

  /**
   * 停止播放
   */
  const stopVoice = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current.close();
      playerRef.current = null;
    }

    setState(prev => ({
      ...prev,
      playingMessageId: null,
    }));
  }, []);

  return {
    ...state,
    playVoice,
    stopVoice,
  };
}
