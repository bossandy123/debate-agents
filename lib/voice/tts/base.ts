/**
 * TTS 服务基础接口和抽象类
 * Feature: 001-voice-emotion
 *
 * 简化版 - 仅保留流式播放所需的接口
 */

import { TTSProvider } from '../types';

// ==================== TTS 提供商接口 ====================

export type TTSProviderType = TTSProvider;

/**
 * TTS 提供商基类
 * 所有 TTS 实现都应该继承此类
 */
export abstract class TTSProviderBase {
  abstract getProvider(): TTSProviderType;
}
