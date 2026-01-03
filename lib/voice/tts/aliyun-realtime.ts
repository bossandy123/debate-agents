/**
 * 阿里云通义千问流式 TTS 实现
 * Feature: 001-voice-emotion
 *
 * 使用 HTTP API 进行流式语音合成
 * 将长文本分块处理，模拟流式效果
 */

import { TTSBase, TTSErrorImpl } from './base';
import { TTSOptions, TTSResult, TTSProvider } from '../types';

interface AliyunRealtimeConfig {
  apiKey: string;
  endpoint: string;
  model: string;
}

// 流式合成结果回调
export interface StreamingCallbacks {
  onAudioChunk?: (audioData: ArrayBuffer) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

export class AliyunRealtimeTTS extends TTSBase {
  private config: AliyunRealtimeConfig;

  constructor() {
    super();
    const apiKey = process.env.ALIYUN_API_KEY;

    if (!apiKey) {
      throw new Error('ALIYUN_API_KEY environment variable is not set');
    }

    this.config = {
      apiKey,
      endpoint:
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
      model: 'qwen3-tts-flash',
    };
  }

  getProvider(): TTSProvider {
    return 'aliyun';
  }

  /**
   * 流式合成语音（模拟流式）
   * 将文本分段，每段生成后立即回调
   */
  async synthesizeStreaming(
    options: TTSOptions,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    const { text, voiceProfile } = options;

    // 预处理文本
    const processedText = this.preprocessText(text);
    if (!processedText) {
      callbacks.onError?.(new Error('Text is empty after preprocessing'));
      return;
    }

    try {
      // 将文本分段（按句子）
      const chunks = this.splitTextIntoChunks(processedText, 300);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // 生成该段的音频
        const result = await this.synthesizeChunk(chunk, voiceProfile);

        // 回调音频数据
        if (result.audioBuffer) {
          callbacks.onAudioChunk?.(result.audioBuffer);
        }

        // 如果不是最后一段，添加一小段静音作为间隔
        if (i < chunks.length - 1) {
          const silence = this.generateSilence(24000, 0.3); // 300ms 静音
          callbacks.onAudioChunk?.(silence);
        }
      }

      // 完成
      callbacks.onDone?.();
    } catch (error) {
      console.error('[AliyunRealtimeTTS] Streaming synthesis failed:', error);
      callbacks.onError?.(
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * 非流式合成（保持兼容性）
   */
  protected async synthesizeInternal(options: TTSOptions): Promise<TTSResult> {
    const { text, voiceProfile } = options;

    // 预处理文本
    const processedText = this.preprocessText(text);
    if (!processedText) {
      throw new Error('Text is empty after preprocessing');
    }

    return this.synthesizeChunk(processedText, voiceProfile);
  }

  /**
   * 合成单个文本块
   */
  private async synthesizeChunk(
    text: string,
    voiceProfile?: TTSOptions['voiceProfile']
  ): Promise<TTSResult> {
    // 映射音色名称
    const voiceName = this.mapVoiceName(voiceProfile?.voiceName);

    // 选择音频格式
    const format = 'wav';

    const requestBody = {
      model: this.config.model,
      input: {
        text: text,
        voice: voiceName,
        language_type: 'Chinese',
      },
      parameters: {
        text_type: 'PlainText',
        audio_format: format,
        sample_rate: 24000,
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      },
    };

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // 检查 API 错误
    if (data.code && data.code !== '') {
      throw new TTSErrorImpl(
        'aliyun',
        data.code,
        data.message || 'Unknown API error',
        this.isRetryableError(data.code)
      );
    }

    // 检查响应数据
    if (!data.output?.audio) {
      throw new Error('No audio data in response');
    }

    // 获取音频数据
    let audioBuffer: ArrayBuffer;

    if (data.output.audio.data) {
      // Base64 编码的音频数据
      const base64Data = data.output.audio.data;
      audioBuffer = Buffer.from(base64Data, 'base64').buffer;
    } else if (data.output.audio.url) {
      // 音频 URL
      const audioResponse = await fetch(data.output.audio.url);
      audioBuffer = await audioResponse.arrayBuffer();
    } else {
      throw new Error('Invalid audio data in response');
    }

    // 计算时长
    const duration = this.calculateAudioDuration(audioBuffer, format);

    return {
      audioBuffer,
      format,
      duration,
      fileSize: audioBuffer.byteLength,
    };
  }

  /**
   * 将文本分段
   */
  private splitTextIntoChunks(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let current = '';

    // 按句子分割
    const sentences = text.split(/([。！？.!?，,、\n])/);

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const nextSentence = sentences[i + 1] || '';

      // 如果是标点符号，加到当前句子
      const fullSentence = sentence + (nextSentence.match(/[。！？.!?，,、\n]/) ? nextSentence : '');

      if ((current + fullSentence).length <= maxLength) {
        current += fullSentence;
        if (nextSentence.match(/[。！？.!?，,、\n]/)) {
          i++; // 跳过已使用的标点
        }
      } else {
        if (current) {
          chunks.push(current);
        }
        current = fullSentence;
        if (nextSentence.match(/[。！？.!?，,、\n]/)) {
          i++; // 跳过已使用的标点
        }
      }
    }

    if (current) {
      chunks.push(current);
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * 生成静音音频
   */
  private generateSilence(sampleRate: number, duration: number): ArrayBuffer {
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(numSamples * 2); // 16-bit = 2 bytes per sample
    const view = new Int16Array(buffer);

    // 填充零（静音）
    for (let i = 0; i < numSamples; i++) {
      view[i] = 0;
    }

    return buffer;
  }

  /**
   * 计算音频时长（WAV 格式）
   */
  private calculateAudioDuration(buffer: ArrayBuffer, format: string): number {
    if (format === 'wav' || format === 'pcm') {
      // 假设 24kHz, 16-bit, mono
      const bytesPerSecond = 24000 * 2;
      return buffer.byteLength / bytesPerSecond;
    }
    // 其他格式，使用估算
    return buffer.byteLength / (24000 * 2);
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(code: string): boolean {
    const retryableCodes = ['rate_limit_exceeded', 'service_unavailable', 'internal_error'];
    return retryableCodes.includes(code);
  }

  /**
   * 预处理文本
   */
  private preprocessText(text: string): string {
    // 移除代码块
    let processed = text.replace(/```[\s\S]*?```/g, '[代码内容已跳过]');

    // 移除 LaTeX 公式
    processed = processed.replace(/\$\$[\s\S]*?\$\$/g, '[公式已跳过]');
    processed = processed.replace(/\$[^\$\n]*\$/g, '[公式已跳过]');

    // 移除图片链接
    processed = processed.replace(/!\[.*?\]\(.*?\)/g, '[图片]');

    // 移除 URL
    processed = processed.replace(/https?:\/\/([^\s]+)\/[^\s]*/g, '$1 的链接');

    // 限制文本长度
    const maxLength = 2000;
    if (processed.length > maxLength) {
      console.warn(
        `[AliyunRealtimeTTS] Text too long (${processed.length} chars), truncating to ${maxLength}`
      );
      processed =
        processed.substring(0, maxLength - 10) + '...（内容过长，已截断）';
    }

    return processed.trim();
  }

  /**
   * 映射音色名称到 API 的音色
   */
  private mapVoiceName(oldVoiceName?: string): string {
    if (!oldVoiceName) return 'Cherry';

    // qwen3-tts-flash 支持的音色
    const supportedVoices = [
      'Cherry',
      'Ethan',
      'Nofish',
      'Jennifer',
      'Ryan',
      'Katerina',
      'Elias',
      'Jada',
      'Dylan',
      'Sunny',
      'Li',
      'Marcus',
      'Roy',
      'Peter',
      'Rocky',
      'Kiki',
      'Eric',
      // 新增音色
      'Serena',
      'Chelsie',
      'Momo',
      'Vivian',
      'Moon',
      'Maia',
      'Kai',
      'Bella',
      'Aiden',
      'Eldric Sage',
      'Mia',
      'Mochi',
      'Bellona',
      'Vincent',
      'Bunny',
      'Neil',
      'Seren',
      'Pip',
      'Stella',
      'Bodega',
      'Sonrisa',
      'Alek',
      'Dolce',
      'Sohee',
      'Ono Anna',
      'Lenn',
      'Emilien',
      'Andre',
      'Radio Gol',
    ];

    // 如果已经是支持的音色，直接返回
    if (supportedVoices.includes(oldVoiceName)) {
      return oldVoiceName;
    }

    // 旧 API 音色到新 API 音色的映射
    const voiceMap: Record<string, string> = {
      'zhichu-v1': 'Cherry',
      'zhiyong-v1': 'Cherry',
      'xiaoyun-v1': 'Cherry',
      'xiaowen-v1': 'Cherry',
      'longxiaochun': 'Cherry',
      'longfei': 'Ethan',
      'longjing': 'Cherry',
      'longbei': 'Ethan',
      'longmiao': 'Cherry',
      'longxiaotian': 'Ethan',
      'longyuan': 'Ethan',
      'longmei': 'Cherry',
      'longxuan': 'Ethan',
      'Aijia': 'Cherry',
      'Aixiao': 'Cherry',
      'Aida': 'Cherry',
      'Aiyue': 'Cherry',
      'Aixia': 'Cherry',
      'Aimei': 'Cherry',
      'Aina': 'Cherry',
      'Aiwei': 'Ethan',
      'Cherry': 'Cherry',
      'Ethan': 'Ethan',
      'Serena': 'Serena',
      'Sky': 'Ethan',
      'Luna': 'Cherry',
      'Andrew': 'Ethan',
      'Rose': 'Cherry',
    };

    return voiceMap[oldVoiceName] || 'Cherry';
  }
}
