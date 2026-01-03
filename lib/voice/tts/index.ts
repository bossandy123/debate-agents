/**
 * TTS 服务入口点
 * Feature: 001-voice-emotion
 */

export { TTSBase, TTSErrorImpl, TTSFactory } from './base';
export type { ITTSService } from './base';
export { AliyunTTS } from './aliyun';
export { AliyunRealtimeTTS } from './aliyun-realtime';
export type { StreamingCallbacks } from './aliyun-realtime';

// Re-export types from ../types
export type { TTSProvider } from '../types';
