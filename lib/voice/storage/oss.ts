/**
 * OSS 对象存储服务
 * Feature: 001-voice-emotion
 *
 * 用于存储生成的音频文件
 * 支持阿里云 OSS 或其他兼容 S3 的存储服务
 */

interface OSSConfig {
  endpoint?: string;
  accessKey?: string;
  secretKey?: string;
  bucket?: string;
  prefix?: string;
}

export class OSSStorage {
  private config: OSSConfig;

  constructor() {
    this.config = {
      endpoint: process.env.OSS_ENDPOINT,
      accessKey: process.env.OSS_ACCESS_KEY,
      secretKey: process.env.OSS_SECRET_KEY,
      bucket: process.env.OSS_BUCKET,
      prefix: process.env.OSS_PREFIX || 'voices/',
    };
  }

  /**
   * 上传音频文件到 OSS
   * @param key 文件键（路径）
   * @param audioBuffer 音频数据
   * @param format 音频格式（wav, mp3 等）
   * @returns 公共访问 URL
   */
  async uploadAudio(_key: string, audioBuffer: ArrayBuffer, format: string = 'wav'): Promise<string> {
    if (!this.config.endpoint) {
      // 如果没有配置 OSS，返回本地数据 URL
      const base64 = Buffer.from(audioBuffer).toString('base64');
      // 根据格式设置正确的 MIME 类型
      const mimeType = format === 'wav' ? 'audio/wav' : 'audio/mp3';
      return `data:${mimeType};base64,${base64}`;
    }

    // TODO: 实现 OSS 上传逻辑
    // 这里需要使用阿里云 OSS SDK 或 AWS S3 SDK
    // 临时返回本地 URL
    console.warn(`[OSSStorage] OSS not configured, using local data URL`);
    const base64 = Buffer.from(audioBuffer).toString('base64');
    const mimeType = format === 'wav' ? 'audio/wav' : 'audio/mp3';
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * 生成文件键
   * @param messageId 消息 ID
   * @param emotionType 情绪类型
   * @returns 文件键
   */
  generateKey(messageId: number, emotionType: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${this.config.prefix}${year}/${month}/${day}/${messageId}_${emotionType}.mp3`;
  }

  /**
   * 检查 OSS 是否已配置
   */
  isConfigured(): boolean {
    return !!(
      this.config.endpoint &&
      this.config.accessKey &&
      this.config.secretKey &&
      this.config.bucket
    );
  }
}
