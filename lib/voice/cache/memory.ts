/**
 * 内存缓存实现
 * Feature: 001-voice-emotion
 *
 * 用于快速访问最近生成的语音文件
 * 使用 LRU (Least Recently Used) 淘汰策略
 */

import { VoiceCache } from '../types';

interface MemoryCacheEntry {
  data: VoiceCache;
  lastAccess: number;
  accessCount: number;
}

export class MemoryCache {
  private cache: Map<string, MemoryCacheEntry> = new Map();
  private maxSize: number;
  private maxAge: number; // milliseconds

  /**
   * @param maxSize 最大缓存条目数（默认 100）
   * @param maxAge 最大缓存时长，单位毫秒（默认 1 小时）
   */
  constructor(maxSize: number = 100, maxAge: number = 60 * 60 * 1000) {
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  /**
   * 获取缓存条目
   */
  get(key: string): VoiceCache | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - entry.lastAccess > this.maxAge) {
      this.delete(key);
      return undefined;
    }

    // 更新访问信息
    entry.lastAccess = now;
    entry.accessCount++;

    return entry.data;
  }

  /**
   * 设置缓存条目
   */
  set(key: string, data: VoiceCache): void {
    // 如果缓存已满，执行 LRU 淘汰
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      lastAccess: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * 删除缓存条目
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - entry.lastAccess > this.maxAge) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取所有缓存键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 清理过期条目
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastAccess > this.maxAge) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * 淘汰最少使用的条目（LRU）
   */
  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`[MemoryCache] Evicted LRU entry: ${oldestKey}`);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    let totalAccess = 0;
    let oldestEntry = Infinity;
    let newestEntry = 0;

    for (const entry of this.cache.values()) {
      totalAccess += entry.accessCount;
      if (entry.lastAccess < oldestEntry) {
        oldestEntry = entry.lastAccess;
      }
      if (entry.lastAccess > newestEntry) {
        newestEntry = entry.lastAccess;
      }
    }

    const hitRate = totalAccess > 0 ? (totalAccess / this.cache.size) : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      oldestEntry: oldestEntry === Infinity ? 0 : oldestEntry,
      newestEntry,
    };
  }
}
