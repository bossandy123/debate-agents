/**
 * 语音功能相关的 TypeScript 类型定义
 * Feature: 001-voice-emotion
 *
 * 简化版 - 仅保留流式播放所需的类型
 */

// ==================== TTS 服务 ====================

export type TTSProvider = 'aliyun';

export interface TTSOptions {
  text: string;
  voiceProfile?: undefined;
  emotion?: undefined;
}
