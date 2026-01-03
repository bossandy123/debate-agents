/**
 * 缓存管理器
 * Feature: 001-voice-emotion
 *
 * 统一管理内存缓存和 SQLite 持久化缓存
 * 实现二级缓存架构：内存 -> SQLite -> OSS/远程
 */

import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import { VoiceCache } from '../types';
import { MemoryCache } from './memory';
import { SQLiteCache } from './storage';

export interface CacheStats {
  memory: {
    size: number;
    maxSize: number;
    hitRate: number;
  };
  storage: {
    totalEntries: number;
    totalSize: number;
    averageAccessCount: number;
  };
}

export class VoiceCacheManager {
  private memoryCache: MemoryCache;
  private storageCache: SQLiteCache;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    db: Database.Database,
    memoryCacheSize: number = 100,
    memoryCacheMaxAge: number = 60 * 60 * 1000 // 1 hour
  ) {
    this.memoryCache = new MemoryCache(memoryCacheSize, memoryCacheMaxAge);
    this.storageCache = new SQLiteCache(db);

    // 启动定期清理任务
    this.startCleanupTask();
  }

  /**
   * 生成内容哈希（用于缓存键）
   */
  generateContentHash(text: string, emotion?: string): string {
    const hash = createHash('sha256');
    hash.update(text);
    if (emotion) {
      hash.update(emotion);
    }
    return hash.digest('hex');
  }

  /**
   * 获取缓存（优先从内存，然后 SQLite）
   */
  async get(messageId: number, text: string, emotion?: string): Promise<VoiceCache | undefined> {
    const contentHash = this.generateContentHash(text, emotion);

    // 1. 尝试从内存缓存获取
    const memCached = this.memoryCache.get(contentHash);
    if (memCached) {
      console.log(`[VoiceCache] Memory cache hit for message ${messageId}`);
      return memCached;
    }

    // 2. 尝试从 SQLite 缓存获取
    const storageCached = this.storageCache.getByContentHash(contentHash);
    if (storageCached) {
      console.log(`[VoiceCache] Storage cache hit for message ${messageId}`);
      // 提升到内存缓存
      this.memoryCache.set(contentHash, storageCached);
      return storageCached;
    }

    // 3. 按 messageId 查询（兼容旧数据）
    const byMessageId = this.storageCache.getByMessageId(messageId);
    if (byMessageId) {
      console.log(`[VoiceCache] Storage cache hit by message ID ${messageId}`);
      this.memoryCache.set(contentHash, byMessageId);
      return byMessageId;
    }

    console.log(`[VoiceCache] Cache miss for message ${messageId}`);
    return undefined;
  }

  /**
   * 设置缓存（同时写入内存和 SQLite）
   */
  async set(
    messageId: number,
    text: string,
    data: Omit<VoiceCache, 'id' | 'messageId' | 'contentHash' | 'createdAt' | 'lastAccessedAt'>
  ): Promise<VoiceCache> {
    const contentHash = this.generateContentHash(text, data.emotionType);

    // 保存到 SQLite
    const cached = this.storageCache.set(messageId, contentHash, {
      ...data,
      contentHash,
    });

    // 提升到内存缓存
    this.memoryCache.set(contentHash, cached);

    console.log(`[VoiceCache] Cached voice for message ${messageId} (hash: ${contentHash.substring(0, 8)}...)`);
    return cached;
  }

  /**
   * 删除缓存
   */
  delete(messageId: number): boolean {
    // 从 SQLite 删除
    const cached = this.storageCache.getByMessageId(messageId);
    if (cached) {
      const contentHash = cached.contentHash;
      this.storageCache.delete(messageId);
      this.memoryCache.delete(contentHash);
      return true;
    }
    return false;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.memoryCache.clear();
    this.storageCache.clear();
    console.log('[VoiceCache] All caches cleared');
  }

  /**
   * 执行缓存清理
   */
  cleanup(): { memory: number; storage: number } {
    const memoryCleaned = this.memoryCache.cleanup();
    const storageCleaned = this.storageCache.cleanup(30, 1); // 30 天，至少访问 1 次

    console.log(`[VoiceCache] Cleanup complete: memory=${memoryCleaned}, storage=${storageCleaned}`);

    return { memory: memoryCleaned, storage: storageCleaned };
  }

  /**
   * 启动定期清理任务
   */
  private startCleanupTask(): void {
    // 每小时清理一次
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);

    console.log('[VoiceCache] Cleanup task scheduled (every hour)');
  }

  /**
   * 停止清理任务
   */
  stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[VoiceCache] Cleanup task stopped');
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    return {
      memory: this.memoryCache.getStats(),
      storage: this.storageCache.getStats(),
    };
  }

  /**
   * 预热缓存（批量加载常用语音）
   * @param messageIds 要预加载的消息 ID 列表
   */
  async warmup(messageIds: number[]): Promise<number> {
    let loaded = 0;

    for (const messageId of messageIds) {
      const cached = this.storageCache.getByMessageId(messageId);
      if (cached) {
        this.memoryCache.set(cached.contentHash, cached);
        loaded++;
      }
    }

    console.log(`[VoiceCache] Warmed up ${loaded}/${messageIds.length} entries`);
    return loaded;
  }

  /**
   * 检查缓存是否存在
   */
  has(messageId: number): boolean {
    return this.storageCache.has(messageId);
  }

  /**
   * 获取缓存命中率估算
   */
  getHitRate(): { memory: number; storage: number } {
    const memStats = this.memoryCache.getStats();
    const storageStats = this.storageCache.getStats();

    return {
      memory: memStats.hitRate,
      storage: storageStats.averageAccessCount,
    };
  }
}
