/**
 * 语音服务
 * Feature: 001-voice-emotion
 *
 * 统一的语音生成和管理服务
 * 整合 TTS、缓存、存储等组件
 */

import Database from 'better-sqlite3';
import { TTSFactory, TTSProvider } from '../voice/tts';
import { OSSStorage } from '../voice/storage/oss';
import { VoiceCacheManager } from '../voice/cache';
import { VoiceRepository } from '../repositories/voice.repository';
import {
  TTSOptions,
  TTSResult,
  VoiceCache,
  VoiceSettings,
  VoiceProfile,
  EmotionAnalysisResult,
} from '../voice/types';

export interface VoiceGenerationRequest {
  messageId: number;
  text: string;
  agentId?: number;
  emotion?: EmotionAnalysisResult;
  provider?: TTSProvider;
}

export interface VoiceGenerationResult {
  success: boolean;
  cached?: boolean;
  audioUrl?: string;
  duration?: number;
  format?: string;
  error?: string;
  generationTime?: number;
}

export class VoiceService {
  private ttsProvider: TTSProvider;
  private cacheManager: VoiceCacheManager;
  private ossStorage: OSSStorage;
  private repo: VoiceRepository;

  constructor(
    db: Database.Database,
    defaultProvider: TTSProvider = 'aliyun'
  ) {
    this.ttsProvider = defaultProvider;
    this.cacheManager = new VoiceCacheManager(db);
    this.ossStorage = new OSSStorage();
    this.repo = new VoiceRepository(db);
  }

  /**
   * 生成语音（带缓存）
   */
  async generateVoice(request: VoiceGenerationRequest): Promise<VoiceGenerationResult> {
    const startTime = Date.now();

    try {
      console.log(`[VoiceService] Generating voice for message ${request.messageId}`);

      // 1. 检查缓存
      const cached = await this.cacheManager.get(
        request.messageId,
        request.text,
        request.emotion?.emotionType
      );

      if (cached) {
        console.log(`[VoiceService] Cache hit for message ${request.messageId}`);
        return {
          success: true,
          cached: true,
          audioUrl: cached.audioUrl,
          duration: cached.duration,
          format: cached.audioFormat,
          generationTime: (Date.now() - startTime) / 1000,
        };
      }

      // 2. 获取 Agent 语音配置（如果有）
      let voiceProfile: VoiceProfile | undefined;
      if (request.agentId) {
        voiceProfile = this.repo.getVoiceProfileByAgentId(request.agentId);
      }

      // 3. 调用 TTS 服务
      const tts = TTSFactory.create(request.provider || this.ttsProvider);

      const ttsOptions: TTSOptions = {
        text: request.text,
        voice: voiceProfile?.voiceName,
        emotion: request.emotion,
      };

      const ttsResult: TTSResult = await tts.synthesize(ttsOptions);

      // 4. 生成音频 URL（直接使用 data URL，无需 OSS）
      const emotionType = request.emotion?.emotionType || 'neutral';
      const audioUrl = await this.ossStorage.uploadAudio(
        this.ossStorage.generateKey(request.messageId, emotionType),
        ttsResult.audioBuffer,
        ttsResult.format
      );

      // 5. 保存到缓存
      const generationTime = (Date.now() - startTime) / 1000;
      const cacheData = await this.cacheManager.set(request.messageId, request.text, {
        emotionType: emotionType as any,
        emotionIntensity: request.emotion?.emotionIntensity || 0.5,
        audioUrl,
        audioFormat: ttsResult.format,
        fileSize: ttsResult.audioBuffer.byteLength,
        duration: ttsResult.duration,
        ttsProvider: request.provider || this.ttsProvider,
        generationTime,
        accessCount: 0,
      });

      console.log(`[VoiceService] Voice generated in ${generationTime.toFixed(2)}s`);

      return {
        success: true,
        cached: false,
        audioUrl: cacheData.audioUrl,
        duration: cacheData.duration,
        format: cacheData.audioFormat,
        generationTime,
      };

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      console.error(`[VoiceService] Error after ${duration.toFixed(2)}s:`, error);

      return this.handleGenerationError(error, request);
    }
  }

  /**
   * 批量生成语音（并行处理）
   */
  async generateVoices(requests: VoiceGenerationRequest[]): Promise<VoiceGenerationResult[]> {
    console.log(`[VoiceService] Batch generating ${requests.length} voices`);

    // 并行处理，但限制并发数
    const concurrency = 3;
    const results: VoiceGenerationResult[] = [];

    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(req => this.generateVoice(req))
      );
      results.push(...batchResults);
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[VoiceService] Batch complete: ${successCount}/${requests.length} successful`);

    return results;
  }

  /**
   * 获取缓存的语音
   */
  async getCachedVoice(messageId: number, text: string, emotion?: string): Promise<VoiceCache | undefined> {
    return this.cacheManager.get(messageId, text, emotion);
  }

  /**
   * 预加载语音缓存
   */
  async preloadVoices(messageIds: number[]): Promise<number> {
    console.log(`[VoiceService] Preloading ${messageIds.length} voices`);
    return this.cacheManager.warmup(messageIds);
  }

  /**
   * 处理生成错误
   */
  private handleGenerationError(error: unknown, _request: VoiceGenerationRequest): VoiceGenerationResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // 检查是否是网络错误（可重试）
    const isNetworkError = errorMessage.includes('ECONNRESET') ||
                          errorMessage.includes('ETIMEDOUT') ||
                          errorMessage.includes('ENOTFOUND');

    if (isNetworkError) {
      console.warn(`[VoiceService] Network error, will retry later: ${errorMessage}`);
      return {
        success: false,
        error: `Network error: ${errorMessage}`,
      };
    }

    // 检查是否是 API 配额错误
    const isQuotaError = errorMessage.includes('quota') ||
                        errorMessage.includes('limit') ||
                        errorMessage.includes('429');

    if (isQuotaError) {
      console.error(`[VoiceService] API quota exceeded: ${errorMessage}`);
      return {
        success: false,
        error: `API quota exceeded. Please check your subscription.`,
      };
    }

    // 检查是否是认证错误
    const isAuthError = errorMessage.includes('auth') ||
                       errorMessage.includes('401') ||
                       errorMessage.includes('403');

    if (isAuthError) {
      console.error(`[VoiceService] Authentication failed: ${errorMessage}`);
      return {
        success: false,
        error: `Authentication failed. Please check your API key.`,
      };
    }

    // 未知错误
    console.error(`[VoiceService] Unknown error: ${errorMessage}`);
    return {
      success: false,
      error: `Failed to generate voice: ${errorMessage}`,
    };
  }

  /**
   * 获取用户语音设置
   */
  getVoiceSettings(userId: string): VoiceSettings | undefined {
    return this.repo.getVoiceSettingsByUserId(userId);
  }

  /**
   * 更新用户语音设置
   */
  updateVoiceSettings(userId: string, settings: Partial<VoiceSettings>): VoiceSettings {
    return this.repo.createOrUpdateVoiceSettings(userId, settings);
  }

  /**
   * 获取 Agent 语音配置
   */
  getVoiceProfile(agentId: number): VoiceProfile | undefined {
    return this.repo.getVoiceProfileByAgentId(agentId);
  }

  /**
   * 更新 Agent 语音配置
   */
  updateVoiceProfile(agentId: number, profile: Partial<VoiceProfile>): VoiceProfile | undefined {
    const existing = this.repo.getVoiceProfileByAgentId(agentId);
    if (!existing) {
      // 创建新的配置
      return this.repo.createVoiceProfile({
        agentId,
        agentType: 'debater',
        ...profile,
      } as any);
    }
    return this.repo.updateVoiceProfile(existing.id, profile);
  }

  /**
   * 初始化默认设置
   */
  initializeDefaultSettings(userId: string): VoiceSettings {
    let settings = this.repo.getVoiceSettingsByUserId(userId);

    if (!settings) {
      console.log(`[VoiceService] Initializing default settings for user ${userId}`);
      settings = this.repo.createOrUpdateVoiceSettings(userId, {
        autoPlay: true,
        defaultVolume: 0.8,
        playbackSpeed: 1.0,
        voiceEnabled: true,
        backgroundPlay: false,
        autoAdvance: true,
        preferredProvider: 'aliyun',
      });
    }

    return settings;
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return this.cacheManager.getStats();
  }

  /**
   * 清理缓存
   */
  cleanupCache() {
    return this.cacheManager.cleanup();
  }

  /**
   * 检查 TTS 服务可用性
   */
  async checkTTSAvailability(provider?: TTSProvider): Promise<boolean> {
    try {
      const tts = TTSFactory.create(provider || this.ttsProvider);
      return await tts.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * 切换 TTS 提供商
   */
  switchProvider(provider: TTSProvider): void {
    console.log(`[VoiceService] Switching TTS provider to ${provider}`);
    this.ttsProvider = provider;
  }

  /**
   * 获取日志摘要
   */
  getLogsSummary(): {
    cacheStats: ReturnType<VoiceCacheManager['getStats']>;
    ttsProvider: TTSProvider;
    ossConfigured: boolean;
  } {
    return {
      cacheStats: this.cacheManager.getStats(),
      ttsProvider: this.ttsProvider,
      ossConfigured: this.ossStorage.isConfigured(),
    };
  }
}

// 单例模式
let serviceInstance: VoiceService | null = null;

export function getVoiceService(db: Database.Database): VoiceService {
  if (!serviceInstance) {
    serviceInstance = new VoiceService(db);
    console.log('[VoiceService] Service initialized');
  }
  return serviceInstance;
}
