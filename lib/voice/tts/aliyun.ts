/**
 * 阿里云通义千问 TTS 实现
 * Feature: 001-voice-emotion
 * API 文档: https://help.aliyun.com/zh/model-studio/qwen-tts-api
 *
 * 使用 HTTP API 进行语音合成（qwen3-tts-flash 模型）
 */

import { TTSBase, TTSErrorImpl } from './base';
import { TTSOptions, TTSResult, TTSProvider } from '../types';

interface AliyunTTSConfig {
  apiKey: string;
  endpoint: string;
  model: string;
}

// 新 API 响应格式
interface AliyunTTSResponse {
  request_id: string;
  code?: string;
  message?: string;
  output?: {
    audio?: {
      url?: string;
      data?: string; // base64 encoded
      id?: string;
      expires_at?: number;
    };
    finish_reason?: string;
  };
  usage?: {
    characters?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
}

export class AliyunTTS extends TTSBase {
  private config: AliyunTTSConfig;

  constructor() {
    super();
    const apiKey = process.env.ALIYUN_API_KEY;

    if (!apiKey) {
      throw new Error('ALIYUN_API_KEY environment variable is not set');
    }

    this.config = {
      apiKey,
      // 使用新的 qwen3-tts-flash API 端点
      endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
      model: 'qwen3-tts-flash',
    };
  }

  getProvider(): TTSProvider {
    return 'aliyun';
  }

  protected async synthesizeInternal(options: TTSOptions): Promise<TTSResult> {
    const { text, voiceProfile } = options;

    // 预处理文本（移除不适合朗读的内容）
    const processedText = this.preprocessText(text);

    // 映射音色名称（新 API 使用 Cherry, Ethan 等）
    const voiceName = this.mapVoiceName(voiceProfile?.voiceName);

    // 构建请求体 - 新 API 格式
    const requestBody = {
      model: this.config.model,
      input: {
        text: processedText,
        voice: voiceName,
        language_type: 'Chinese',
      },
    };

    // 应用情绪参数（如果有）- 新 API 可能不支持这些参数
    // 暂时保留注释，实际效果需要测试
    // if (emotion) {
    //   const emotionParams = this.applyEmotionParams(emotion);
    //   Object.assign(requestBody.input, emotionParams);
    // }

    console.log(`[AliyunTTS] Request:`, JSON.stringify(requestBody, null, 2));

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'disable', // 禁用 SSE，使用普通 HTTP 响应
        },
        body: JSON.stringify(requestBody),
      });

      // 获取响应文本以便调试
      const responseText = await response.text();
      console.log(`[AliyunTTS] Response status: ${response.status}`);
      console.log(`[AliyunTTS] Response body:`, responseText.substring(0, 500));

      if (!response.ok) {
        throw new TTSErrorImpl(
          'aliyun',
          'HTTP_ERROR',
          `HTTP ${response.status}: ${responseText}`,
          response.status >= 500
        );
      }

      const data: AliyunTTSResponse = JSON.parse(responseText);

      // 新 API 响应成功时没有 status_code 字段
      // 检查是否有错误（通过 code 和 message 字段）
      if (data.code && data.code !== '') {
        console.error(`[AliyunTTS] API error:`, data);
        throw new TTSErrorImpl(
          'aliyun',
          data.code,
          data.message || 'Unknown API error',
          this.isRetryableByCode(data.code)
        );
      }

      // 检查是否有音频数据
      if (!data.output?.audio) {
        throw new TTSErrorImpl('aliyun', 'NO_AUDIO', 'No audio data in response', false);
      }

      // 优先使用 base64 data，其次使用 URL
      let audioBuffer: ArrayBuffer;
      let format: 'mp3' | 'wav' | 'opus' = 'wav';

      if (data.output?.audio?.data) {
        // 使用 base64 编码的音频数据
        const binaryString = Buffer.from(data.output.audio.data, 'base64');
        audioBuffer = binaryString.buffer.slice(
          binaryString.byteOffset,
          binaryString.byteOffset + binaryString.byteLength
        );
        console.log(`[AliyunTTS] Using base64 audio data: ${audioBuffer.byteLength} bytes`);
      } else if (data.output?.audio?.url) {
        // 从 URL 下载音频
        console.log(`[AliyunTTS] Downloading audio from URL:`, data.output.audio.url);
        const audioResponse = await fetch(data.output.audio.url);
        if (!audioResponse.ok) {
          throw new TTSErrorImpl('aliyun', 'AUDIO_DOWNLOAD_ERROR', 'Failed to download audio', false);
        }
        audioBuffer = await audioResponse.arrayBuffer();
        console.log(`[AliyunTTS] Downloaded audio: ${audioBuffer.byteLength} bytes`);

        // 从 URL 判断格式
        const url = data.output.audio.url.toLowerCase();
        if (url.includes('.mp3')) format = 'mp3';
        else if (url.includes('.wav')) format = 'wav';
        else if (url.includes('.opus')) format = 'opus';
      } else {
        throw new TTSErrorImpl('aliyun', 'NO_AUDIO', 'No audio data in response', false);
      }

      // 计算音频时长（WAV 格式）
      const duration = this.calculateAudioDuration(audioBuffer, format);

      console.log(`[AliyunTTS] Generated audio: ${audioBuffer.byteLength} bytes, ${duration.toFixed(2)}s, format: ${format}`);

      return {
        audioBuffer,
        format,
        duration,
        fileSize: audioBuffer.byteLength,
      };
    } catch (error) {
      console.error(`[AliyunTTS] Request failed:`, error);

      if (error instanceof TTSErrorImpl) {
        throw error;
      }

      throw new TTSErrorImpl(
        'aliyun',
        'REQUEST_FAILED',
        error instanceof Error ? error.message : 'Unknown error',
        false
      );
    }
  }

  /**
   * 计算 WAV 音频时长
   */
  private calculateAudioDuration(buffer: ArrayBuffer, format: string): number {
    if (format === 'wav' && buffer.byteLength > 44) {
      // WAV 文件头，字节 24-27 是采样率，28-31 是字节率
      const view = new DataView(buffer);
      const byteRate = view.getUint32(28, true); // little-endian
      if (byteRate > 0) {
        return (buffer.byteLength - 44) / byteRate;
      }
      // 默认假设 24kHz, 16-bit mono
      return (buffer.byteLength - 44) / (24000 * 2);
    }
    // 对于其他格式或无法确定的情况，返回 0
    return 0;
  }

  /**
   * 判断错误代码是否可重试
   */
  private isRetryableByCode(code?: string): boolean {
    if (!code) return false;

    // 可重试的错误代码
    const retryableCodes = [
      '429', // Too Many Requests
      '500', // Internal Server Error
      '502', // Bad Gateway
      '503', // Service Unavailable
      '504', // Gateway Timeout
      'rate_limit_exceeded',
      'quota_exceeded',
    ];

    return retryableCodes.includes(code);
  }

  /**
   * 预处理文本（移除不适合朗读的内容）
   */
  private preprocessText(text: string): string {
    // 移除代码块
    let processed = text.replace(/```[\s\S]*?```/g, '[代码内容已跳过]');

    // 移除 LaTeX 公式
    processed = processed.replace(/\$\$[\s\S]*?\$\$/g, '[公式已跳过]');
    processed = processed.replace(/\$[^$\n]*\$/g, '[公式已跳过]');

    // 移除图片链接
    processed = processed.replace(/!\[.*?\]\(.*?\)/g, '[图片]');

    // 移除 URL，但保留域名（用于朗读）
    processed = processed.replace(/https?:\/\/([^\s]+)\/[^\s]*/g, '$1 的链接');

    // 限制文本长度（qwen3-tts-flash 限制为 600 字符）
    const maxLength = 600;
    if (processed.length > maxLength) {
      console.warn(`[AliyunTTS] Text too long (${processed.length} chars), truncating to ${maxLength}`);
      processed = processed.substring(0, maxLength - 10) + '...（内容过长，已截断）';
    }

    return processed.trim();
  }

  /**
   * 映射音色名称到 qwen3-tts-flash API 的音色
   */
  private mapVoiceName(oldVoiceName?: string): string {
    if (!oldVoiceName) return 'Cherry';

    // qwen3-tts-flash 支持的音色
    const supportedVoices = [
      'Cherry', 'Ethan', 'Nofish', 'Jennifer', 'Ryan', 'Katerina', 'Elias',
      'Jada', 'Dylan', 'Sunny', 'Li', 'Marcus', 'Roy', 'Peter', 'Rocky', 'Kiki', 'Eric'
    ];

    // 如果已经是支持的音色，直接返回
    if (supportedVoices.includes(oldVoiceName)) {
      return oldVoiceName;
    }

    // 旧 API 音色到新 API 音色的映射
    const voiceMap: Record<string, string> = {
      // 旧 API 音色 -> qwen3-tts-flash 音色
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
      'Serena': 'Cherry',
      'Sky': 'Ethan',
      'Luna': 'Cherry',
      'Andrew': 'Ethan',
      'Rose': 'Cherry',
    };

    return voiceMap[oldVoiceName] || 'Cherry';
  }
}
