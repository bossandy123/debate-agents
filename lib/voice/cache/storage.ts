/**
 * SQLite 持久化缓存
 * Feature: 001-voice-emotion
 *
 * 提供持久化的语音缓存存储
 * 与内存缓存配合使用，实现二级缓存架构
 */

import Database from 'better-sqlite3';
import { VoiceCache } from '../types';

// 数据库行类型（使用下划线命名）
interface DbRow {
  id: number;
  message_id: number;
  content_hash: string;
  emotion_type: string;
  emotion_intensity: number;
  audio_url: string;
  audio_format: string;
  file_size: number;
  duration: number;
  tts_provider: string;
  generation_time: number;
  created_at: number;
  expires_at: number | null;
  access_count: number;
  last_accessed_at: number | null;
}

/**
 * 将数据库行转换为 VoiceCache（下划线 -> 驼峰命名）
 */
function rowToCache(row: DbRow): VoiceCache {
  return {
    id: row.id,
    messageId: row.message_id,
    contentHash: row.content_hash,
    emotionType: row.emotion_type as 'intense' | 'neutral' | 'calm',
    emotionIntensity: row.emotion_intensity,
    audioUrl: row.audio_url,
    audioFormat: row.audio_format as 'mp3' | 'wav' | 'opus',
    fileSize: row.file_size,
    duration: row.duration,
    ttsProvider: row.tts_provider,
    generationTime: row.generation_time,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? undefined,
    accessCount: row.access_count,
    lastAccessedAt: row.last_accessed_at ?? undefined,
  };
}

export class SQLiteCache {
  constructor(private db: Database.Database) {}

  /**
   * 获取缓存条目（通过消息 ID）
   */
  getByMessageId(messageId: number): VoiceCache | undefined {
    const stmt = this.db.prepare('SELECT * FROM voice_cache WHERE message_id = ?');
    const row = stmt.get(messageId) as DbRow | undefined;

    if (row) {
      // 更新访问统计
      const updateStmt = this.db.prepare(`
        UPDATE voice_cache
        SET access_count = access_count + 1,
            last_accessed_at = strftime('%s', 'now')
        WHERE id = ?
      `);
      updateStmt.run(row.id);

      return rowToCache(row);
    }

    return undefined;
  }

  /**
   * 获取缓存条目（通过内容哈希）
   */
  getByContentHash(contentHash: string): VoiceCache | undefined {
    const stmt = this.db.prepare('SELECT * FROM voice_cache WHERE content_hash = ?');
    const row = stmt.get(contentHash) as DbRow | undefined;

    if (row) {
      // 更新访问统计
      const updateStmt = this.db.prepare(`
        UPDATE voice_cache
        SET access_count = access_count + 1,
            last_accessed_at = strftime('%s', 'now')
        WHERE id = ?
      `);
      updateStmt.run(row.id);

      return rowToCache(row);
    }

    return undefined;
  }

  /**
   * 保存缓存条目
   */
  set(messageId: number, contentHash: string, data: Partial<VoiceCache>): VoiceCache {
    const stmt = this.db.prepare(`
      INSERT INTO voice_cache (
        message_id, content_hash, emotion_type, emotion_intensity,
        audio_url, audio_format, file_size, duration, tts_provider, generation_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      messageId,
      contentHash,
      data.emotionType || 'neutral',
      data.emotionIntensity || 0.5,
      data.audioUrl,
      data.audioFormat || 'mp3',
      data.fileSize,
      data.duration,
      data.ttsProvider,
      data.generationTime
    );

    const selectStmt = this.db.prepare('SELECT * FROM voice_cache WHERE id = ?');
    const row = selectStmt.get(result.lastInsertRowid as number) as DbRow;
    return rowToCache(row);
  }

  /**
   * 删除缓存条目
   */
  delete(messageId: number): boolean {
    const cached = this.getByMessageId(messageId);
    if (!cached) {
      return false;
    }

    const stmt = this.db.prepare('DELETE FROM voice_cache WHERE id = ?');
    const result = stmt.run(cached.id);
    return result.changes > 0;
  }

  /**
   * 清理过期或低频访问的缓存
   * @param maxAge 最大缓存时长（天数）
   * @param minAccessCount 最小访问次数（低于此值的会被删除）
   * @returns 删除的条目数
   */
  cleanup(maxAge: number = 30, minAccessCount: number = 1): number {
    const stmt = this.db.prepare(`
      DELETE FROM voice_cache
      WHERE
        (strftime('%s', 'now') - created_at) > ? * 86400
        OR access_count < ?
    `);

    const result = stmt.run(maxAge, minAccessCount);
    console.log(`[SQLiteCache] Cleaned up ${result.changes} entries`);
    return result.changes;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    totalEntries: number;
    totalSize: number;
    averageAccessCount: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM voice_cache');
    const sizeStmt = this.db.prepare('SELECT SUM(file_size) as size FROM voice_cache');
    const avgStmt = this.db.prepare('SELECT AVG(access_count) as avg FROM voice_cache');
    const oldestStmt = this.db.prepare('SELECT MIN(created_at) as oldest FROM voice_cache');
    const newestStmt = this.db.prepare('SELECT MAX(created_at) as newest FROM voice_cache');

    const count = countStmt.get() as { count: number };
    const size = sizeStmt.get() as { size: number | null };
    const avg = avgStmt.get() as { avg: number | null };
    const oldest = oldestStmt.get() as { oldest: number | null };
    const newest = newestStmt.get() as { newest: number | null };

    return {
      totalEntries: count.count,
      totalSize: size.size || 0,
      averageAccessCount: avg.avg || 0,
      oldestEntry: oldest.oldest || 0,
      newestEntry: newest.newest || 0,
    };
  }

  /**
   * 检查缓存是否存在
   */
  has(messageId: number): boolean {
    return this.getByMessageId(messageId) !== undefined;
  }

  /**
   * 清空所有缓存
   */
  clear(): boolean {
    const stmt = this.db.prepare('DELETE FROM voice_cache');
    const result = stmt.run();
    console.log(`[SQLiteCache] Cleared ${result.changes} entries`);
    return result.changes > 0;
  }
}
