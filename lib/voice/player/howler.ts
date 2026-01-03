/**
 * Howler.js 封装
 * Feature: 001-voice-emotion
 *
 * 提供统一的音频播放接口
 * 封装 Howler.js 库的复杂性
 */

import { Howl } from 'howler';

export interface AudioPlayerOptions {
  src: string | string[];
  html5?: boolean;
  volume?: number;
  autoplay?: boolean;
  loop?: boolean;
  rate?: number;
  onplay?: () => void;
  onpause?: () => void;
  onend?: () => void;
  onstop?: () => void;
  onerror?: (error: any) => void;
}

export interface PlaybackState {
  playing: boolean;
  paused: boolean;
  ended: boolean;
  loading: boolean;
  error: boolean;
  duration: number;
  position: number;
  volume: number;
  rate: number;
}

/**
 * 音频播放器封装类
 */
export class AudioPlayer {
  private howl: Howl | null = null;
  private state: PlaybackState;
  private positionUpdateInterval: number | null = null;

  constructor() {
    this.state = {
      playing: false,
      paused: false,
      ended: false,
      loading: false,
      error: false,
      duration: 0,
      position: 0,
      volume: 0.8,
      rate: 1.0,
    };
  }

  /**
   * 加载音频
   */
  load(options: AudioPlayerOptions): void {
    // 如果已有播放中的音频，先停止
    if (this.howl) {
      this.unload();
    }

    this.state = {
      ...this.state,
      loading: true,
      error: false,
      ended: false,
      playing: false,
      paused: false,
      duration: 0,
      position: 0,
      volume: options.volume ?? 0.8,
      rate: options.rate ?? 1.0,
    };

    this.howl = new Howl({
      src: Array.isArray(options.src) ? options.src : [options.src],
      html5: options.html5 ?? true,
      volume: this.state.volume,
      rate: this.state.rate,
      autoplay: options.autoplay ?? false,
      loop: options.loop ?? false,
      onplay: () => {
        this.state.playing = true;
        this.state.paused = false;
        this.state.loading = false;
        this.startPositionUpdate();
        options.onplay?.();
      },
      onpause: () => {
        this.state.paused = true;
        this.state.playing = false;
        this.stopPositionUpdate();
        options.onpause?.();
      },
      onend: () => {
        this.state.ended = true;
        this.state.playing = false;
        this.state.paused = false;
        this.stopPositionUpdate();
        options.onend?.();
      },
      onstop: () => {
        this.state.playing = false;
        this.state.paused = false;
        this.stopPositionUpdate();
        options.onstop?.();
      },
      onloaderror: (_, error) => {
        this.state.error = true;
        this.state.loading = false;
        console.error('[AudioPlayer] Load error:', error);
        options.onerror?.(error);
      },
      onload: () => {
        this.state.loading = false;
        this.state.duration = this.howl!.duration();
      },
    });
  }

  /**
   * 播放
   */
  play(): void {
    if (!this.howl) {
      console.warn('[AudioPlayer] No audio loaded');
      return;
    }

    if (this.state.playing) {
      console.debug('[AudioPlayer] Already playing');
      return;
    }

    try {
      this.howl.play();
    } catch (error) {
      // 捕获并忽略 AbortError，避免未处理的 promise rejection
      if ((error as Error).name === 'AbortError') {
        console.debug('[AudioPlayer] Play was aborted, ignoring');
      } else {
        console.error('[AudioPlayer] Play error:', error);
        throw error;
      }
    }
  }

  /**
   * 暂停
   */
  pause(): void {
    if (!this.howl) {
      return;
    }

    // 检查实际播放状态，而不仅仅是我们的内部状态
    const actuallyPlaying = this.howl.playing();

    if (!actuallyPlaying && !this.state.playing) {
      return;
    }

    try {
      if (actuallyPlaying) {
        this.howl.pause();
      }
    } catch (error) {
      // 捕获并忽略 AbortError
      if ((error as Error).name !== 'AbortError') {
        console.error('[AudioPlayer] Pause error:', error);
      }
    }
  }

  /**
   * 停止
   */
  stop(): void {
    if (!this.howl) {
      return;
    }

    this.howl.stop();
    this.state.position = 0;
  }

  /**
   * 跳转到指定位置
   */
  seek(position: number): void {
    if (!this.howl) {
      return;
    }

    this.howl.seek(position);
    this.state.position = position;
  }

  /**
   * 设置音量
   */
  setVolume(volume: number): void {
    if (!this.howl) {
      return;
    }

    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.howl.volume(clampedVolume);
    this.state.volume = clampedVolume;
  }

  /**
   * 设置播放速度
   */
  setRate(rate: number): void {
    if (!this.howl) {
      return;
    }

    const clampedRate = Math.max(0.5, Math.min(2, rate));
    this.howl.rate(clampedRate);
    this.state.rate = clampedRate;
  }

  /**
   * 获取当前状态
   */
  getState(): Readonly<PlaybackState> {
    // 更新当前位置
    if (this.howl && this.state.playing) {
      this.state.position = this.howl.seek() as number;
    }

    return { ...this.state };
  }

  /**
   * 是否正在播放
   */
  isPlaying(): boolean {
    return this.state.playing;
  }

  /**
   * 是否已加载
   */
  isLoaded(): boolean {
    return this.howl !== null && this.state.duration > 0;
  }

  /**
   * 是否出错
   */
  hasError(): boolean {
    return this.state.error;
  }

  /**
   * 卸载音频
   */
  unload(): void {
    if (this.howl) {
      this.stop();
      this.howl.unload();
      this.howl = null;
    }

    this.stopPositionUpdate();

    this.state = {
      playing: false,
      paused: false,
      ended: false,
      loading: false,
      error: false,
      duration: 0,
      position: 0,
      volume: 0.8,
      rate: 1.0,
    };
  }

  /**
   * 开始位置更新定时器
   */
  private startPositionUpdate(): void {
    this.stopPositionUpdate();

    this.positionUpdateInterval = window.setInterval(() => {
      if (this.howl && this.state.playing) {
        this.state.position = this.howl.seek() as number;
      }
    }, 100); // 每 100ms 更新一次
  }

  /**
   * 停止位置更新定时器
   */
  private stopPositionUpdate(): void {
    if (this.positionUpdateInterval !== null) {
      clearInterval(this.positionUpdateInterval);
      this.positionUpdateInterval = null;
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.unload();
  }
}

/**
 * 播放器管理器（单例模式）
 * 确保同一时间只有一个音频在播放
 */
export class AudioPlayerManager {
  private static instance: AudioPlayerManager | null = null;
  private currentPlayer: AudioPlayer | null = null;

  private constructor() {}

  static getInstance(): AudioPlayerManager {
    if (!AudioPlayerManager.instance) {
      AudioPlayerManager.instance = new AudioPlayerManager();
    }
    return AudioPlayerManager.instance;
  }

  /**
   * 播放音频（自动停止当前播放的音频）
   */
  play(options: AudioPlayerOptions): AudioPlayer {
    // 停止当前播放
    if (this.currentPlayer) {
      this.currentPlayer.stop();
      this.currentPlayer.unload();
    }

    // 创建新播放器
    const player = new AudioPlayer();
    player.load(options);

    this.currentPlayer = player;
    return player;
  }

  /**
   * 停止当前播放
   */
  stop(): void {
    if (this.currentPlayer) {
      this.currentPlayer.stop();
      this.currentPlayer.unload();
      this.currentPlayer = null;
    }
  }

  /**
   * 获取当前播放器
   */
  getCurrentPlayer(): AudioPlayer | null {
    return this.currentPlayer;
  }

  /**
   * 是否正在播放
   */
  isPlaying(): boolean {
    return this.currentPlayer?.isPlaying() ?? false;
  }
}
