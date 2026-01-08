/**
 * TTS 服务入口点
 * Feature: 001-voice-emotion
 */

export { TTSProviderBase } from './base';
export type { TTSProviderType } from './base';
export { AliyunRealtimeTTS } from './aliyun-realtime';
export type { StreamingCallbacks } from './aliyun-realtime';

// Re-export types from ../types
export type { TTSProvider } from '../types';
