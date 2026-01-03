/**
 * 语音功能相关的 TypeScript 类型定义
 * Feature: 001-voice-emotion
 */

// ==================== 语音配置 ====================

export interface VoiceProfile {
  id: number;
  agentId: number;
  agentType: 'debater' | 'judge' | 'audience';
  voiceName: string;
  voiceGender?: 'male' | 'female';
  voiceAge?: 'young' | 'middle' | 'mature';
  basePitch: number;        // 0.5 - 2.0
  baseSpeed: number;        // 0.5 - 2.0
  baseVolume: number;       // 0.0 - 1.0
  ttsProvider: 'aliyun' | 'doubao' | 'tencent';
  createdAt: number;
  updatedAt: number;
}

export interface CreateVoiceProfileDTO {
  agentId: number;
  agentType: 'debater' | 'judge' | 'audience';
  voiceName?: string;
  voiceGender?: 'male' | 'female';
  voiceAge?: 'young' | 'middle' | 'mature';
  basePitch?: number;
  baseSpeed?: number;
  baseVolume?: number;
  ttsProvider?: 'aliyun' | 'doubao' | 'tencent';
}

export interface UpdateVoiceProfileDTO {
  voiceName?: string;
  voiceGender?: 'male' | 'female';
  voiceAge?: 'young' | 'middle' | 'mature';
  basePitch?: number;
  baseSpeed?: number;
  baseVolume?: number;
  ttsProvider?: 'aliyun' | 'doubao' | 'tencent';
}

// ==================== 语音缓存 ====================

export interface VoiceCache {
  id: number;
  messageId: number;
  contentHash: string;
  emotionType: 'intense' | 'neutral' | 'calm';
  emotionIntensity: number;  // 0.0 - 1.0
  audioUrl: string;
  audioFormat: 'mp3' | 'wav' | 'opus';
  fileSize: number;
  duration: number;
  ttsProvider: string;
  generationTime: number;
  createdAt: number;
  expiresAt?: number;
  accessCount: number;
  lastAccessedAt?: number;
}

// ==================== 用户语音设置 ====================

export interface VoiceSettings {
  id: number;
  userId: string;
  autoPlay: boolean;
  defaultVolume: number;    // 0.0 - 1.0
  playbackSpeed: number;    // 0.5 - 2.0
  voiceEnabled: boolean;
  backgroundPlay: boolean;
  autoAdvance: boolean;
  preferredProvider: 'aliyun' | 'doubao' | 'tencent';
  createdAt: number;
  updatedAt: number;
}

export interface UpdateVoiceSettingsDTO {
  autoPlay?: boolean;
  defaultVolume?: number;
  playbackSpeed?: number;
  voiceEnabled?: boolean;
  backgroundPlay?: boolean;
  autoAdvance?: boolean;
  preferredProvider?: 'aliyun' | 'doubao' | 'tencent';
}

// ==================== 情绪分析 ====================

export interface EmotionAnalysis {
  id: number;
  messageId: number;
  emotionType: 'intense' | 'neutral' | 'calm';
  emotionIntensity: number;  // 0.0 - 1.0
  pitchShift: number;        // 0.5 - 2.0
  speedMultiplier: number;   // 0.5 - 2.0
  volumeBoost: number;       // 0.0 - 2.0
  reasoning?: string;
  confidence: number;        // 0.0 - 1.0
  modelUsed: string;
  createdAt: number;
}

export interface EmotionAnalysisResult {
  emotionType: 'intense' | 'neutral' | 'calm';
  emotionIntensity: number;
  pitchShift: number;
  speedMultiplier: number;
  volumeBoost: number;
  reasoning?: string;
  confidence: number;
}

// ==================== 播放会话 ====================

export interface PlaybackSession {
  id: number;
  sessionId: string;
  debateId: number;
  userId: string;
  status: 'idle' | 'playing' | 'paused' | 'stopped';
  currentMessageId?: number;
  playlist: number[];
  currentPosition: number;   // 秒
  repeatMode: 'none' | 'all' | 'one';
  shuffle: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreatePlaybackSessionDTO {
  debateId: number;
  playlist: number[];
  repeatMode?: 'none' | 'all' | 'one';
  shuffle?: boolean;
}

export interface UpdatePlaybackSessionDTO {
  action: 'play' | 'pause' | 'stop' | 'seek' | 'next' | 'previous';
  position?: number;
  messageId?: number;
}

// ==================== TTS 服务 ====================

export type TTSProvider = 'aliyun' | 'doubao' | 'tencent';

export interface TTSOptions {
  text: string;
  voice?: string;
  emotion?: EmotionAnalysisResult;
  voiceProfile?: VoiceProfile;
  provider?: TTSProvider;
}

export interface TTSResult {
  audioBuffer: ArrayBuffer;
  format: 'mp3' | 'wav' | 'opus';
  duration: number;
  fileSize: number;
}

export interface TTSError extends Error {
  code: string;
  provider: TTSProvider;
  retryable: boolean;
}

// ==================== 播放器 ====================

export interface PlayState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
}

export type PlayEvent =
  | { type: 'play'; messageId: number }
  | { type: 'pause'; messageId: number; position: number }
  | { type: 'end'; messageId: number }
  | { type: 'error'; messageId: number; error: string }
  | { type: 'progress'; messageId: number; position: number };

// ==================== API 响应 ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: number;
    requestId: string;
  };
}

// ==================== SSE 事件 ====================

export type VoiceStreamEvent =
  | { type: 'voice_generating'; data: { messageId: number; timestamp: number } }
  | { type: 'voice_ready'; data: { messageId: number; audioUrl: string; duration: number } }
  | { type: 'voice_playing'; data: { messageId: number; position: number } }
  | { type: 'voice_paused'; data: { messageId: number; position: number } }
  | { type: 'voice_ended'; data: { messageId: number } }
  | { type: 'voice_error'; data: { messageId: number; error: string } };
