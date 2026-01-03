/**
 * TTS 服务基础接口和抽象类
 * Feature: 001-voice-emotion
 */

import { TTSOptions, TTSResult, TTSError, TTSProvider, EmotionAnalysisResult } from '../types';

// ==================== TTS 接口 ====================

export interface ITTSService {
  /**
   * 将文本转换为语音
   * @param options TTS 选项
   * @returns 音频结果
   */
  synthesize(options: TTSOptions): Promise<TTSResult>;

  /**
   * 检查服务是否可用
   */
  isAvailable(): Promise<boolean>;

  /**
   * 获取提供商名称
   */
  getProvider(): TTSProvider;
}

export class TTSErrorImpl extends Error implements TTSError {
  code: string;
  provider: TTSProvider;
  retryable: boolean;

  constructor(
    provider: TTSProvider,
    code: string,
    message: string,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'TTSError';
    this.provider = provider;
    this.code = code;
    this.retryable = retryable;
  }
}

// ==================== TTS 抽象基类 ====================

export abstract class TTSBase implements ITTSService {
  protected readonly maxRetries: number = 3;
  protected readonly retryDelay: number = 1000; // ms

  abstract getProvider(): TTSProvider;
  protected abstract synthesizeInternal(options: TTSOptions): Promise<TTSResult>;

  async synthesize(options: TTSOptions): Promise<TTSResult> {
    const startTime = Date.now();

    try {
      console.log(`[TTS:${this.getProvider()}] Generating voice for text: "${options.text.substring(0, 50)}..."`);

      if (options.emotion) {
        console.log(`[TTS:${this.getProvider()}] Emotion:`, options.emotion);
      }

      const result = await this.synthesizeWithRetry(options);

      const duration = (Date.now() - startTime) / 1000;
      console.log(`[TTS:${this.getProvider()}] Voice generated successfully in ${duration.toFixed(2)}s`);

      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      console.error(`[TTS:${this.getProvider()}] Error after ${duration.toFixed(2)}s:`, error);

      if (error instanceof TTSErrorImpl) {
        throw error;
      }

      throw new TTSErrorImpl(
        this.getProvider(),
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        false
      );
    }
  }

  private async synthesizeWithRetry(options: TTSOptions): Promise<TTSResult> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.synthesizeInternal(options);
      } catch (error) {
        lastError = error as Error;

        if (!this.isRetryable(error as Error)) {
          break;
        }

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.log(`[TTS:${this.getProvider()}] Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw new TTSErrorImpl(
      this.getProvider(),
      'MAX_RETRIES_EXCEEDED',
      `Failed after ${this.maxRetries} retries: ${lastError?.message || 'Unknown error'}`,
      true
    );
  }

  protected isRetryable(error: Error): boolean {
    // 可重试的错误类型
    const retryablePatterns = [
      /ECONNRESET/,
      /ETIMEDOUT/,
      /ENOTFOUND/,
      /ECONNREFUSED/,
      /5\d\d/, // HTTP 5xx
      /timeout/i,
      /network/i,
    ];

    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async isAvailable(): Promise<boolean> {
    try {
      // 尝试合成一个简单的测试文本
      await this.synthesize({ text: '测试' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 将情绪分析结果转换为 TTS 参数
   */
  protected mapEmotionToTTSParams(emotion: EmotionAnalysisResult): {
    pitch: number;
    rate: number;
    volume: number;
  } {
    // 根据情绪类型调整参数
    const basePitch = emotion.pitchShift;
    const baseRate = emotion.speedMultiplier;
    const baseVolume = emotion.volumeBoost;

    let pitch = basePitch;
    let rate = baseRate;
    let volume = baseVolume;

    switch (emotion.emotionType) {
      case 'intense':
        // 激烈反驳：语调高、语速快、音量大
        pitch = Math.min(2.0, basePitch * 1.2);
        rate = Math.min(2.0, baseRate * 1.3);
        volume = Math.min(2.0, baseVolume * 1.2);
        break;

      case 'calm':
        // 从容总结：语调低、语速慢、音量适中
        pitch = Math.max(0.5, basePitch * 0.9);
        rate = Math.max(0.5, baseRate * 0.9);
        volume = baseVolume;
        break;

      case 'neutral':
      default:
        // 理性立论：保持默认
        pitch = basePitch;
        rate = baseRate;
        volume = baseVolume;
        break;
    }

    // 应用情绪强度
    const intensity = emotion.emotionIntensity;
    pitch = 1.0 + (pitch - 1.0) * intensity;
    rate = 1.0 + (rate - 1.0) * intensity;
    volume = 1.0 + (volume - 1.0) * intensity;

    return { pitch, rate, volume };
  }
}

// ==================== TTS 工厂 ====================

export class TTSFactory {
  private static instances: Map<TTSProvider, ITTSService> = new Map();

  static create(provider: TTSProvider): ITTSService {
    if (!this.instances.has(provider)) {
      switch (provider) {
        case 'aliyun': {
          // Lazy import to avoid circular dependency during build
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { AliyunTTS } = require('./aliyun');
          this.instances.set(provider, new AliyunTTS());
          break;
        }
        case 'doubao':
          // TODO: 实现豆包语音
          throw new Error('Doubao TTS not implemented yet');
        case 'tencent':
          // TODO: 实现腾讯云 TTS
          throw new Error('Tencent TTS not implemented yet');
        default:
          throw new Error(`Unknown TTS provider: ${provider}`);
      }
    }

    return this.instances.get(provider)!;
  }
}
