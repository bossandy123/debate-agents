/**
 * 语音数据访问层
 * Feature: 001-voice-emotion
 */

import Database from 'better-sqlite3';
import {
  VoiceProfile,
  VoiceCache,
  VoiceSettings,
  EmotionAnalysis,
  EmotionAnalysisResult,
  PlaybackSession,
  CreateVoiceProfileDTO,
  UpdateVoiceProfileDTO,
  UpdateVoiceSettingsDTO,
} from '../voice/types';

/**
 * 本地存储回退（当数据库不可用时）
 * Feature: 001-voice-emotion - T048
 */
const LOCAL_STORAGE_KEY = 'voice_settings_fallback';

function getLocalStorageSettings(userId: string): VoiceSettings | undefined {
  if (typeof window === 'undefined') return undefined;
  if (typeof localStorage === 'undefined') return undefined;

  try {
    const key = `${LOCAL_STORAGE_KEY}_${userId}`;
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('[VoiceRepository] Failed to read from localStorage:', error);
  }
  return undefined;
}

function setLocalStorageSettings(userId: string, settings: VoiceSettings): void {
  if (typeof window === 'undefined') return;
  if (typeof localStorage === 'undefined') return;

  try {
    const key = `${LOCAL_STORAGE_KEY}_${userId}`;
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (error) {
    console.warn('[VoiceRepository] Failed to write to localStorage:', error);
  }
}

export class VoiceRepository {
  constructor(private db: Database.Database) {}

  // ==================== VoiceProfile ====================

  createVoiceProfile(dto: CreateVoiceProfileDTO): VoiceProfile {
    const stmt = this.db.prepare(`
      INSERT INTO voice_profiles (
        agent_id, agent_type, voice_name, voice_gender, voice_age,
        base_pitch, base_speed, base_volume, tts_provider
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      dto.agentId,
      dto.agentType,
      dto.voiceName || 'default',
      dto.voiceGender || null,
      dto.voiceAge || null,
      dto.basePitch || 1.0,
      dto.baseSpeed || 1.0,
      dto.baseVolume || 1.0,
      dto.ttsProvider || 'aliyun'
    );

    return this.getVoiceProfileById(result.lastInsertRowid as number)!;
  }

  getVoiceProfileById(id: number): VoiceProfile | undefined {
    const stmt = this.db.prepare('SELECT * FROM voice_profiles WHERE id = ?');
    return stmt.get(id) as VoiceProfile | undefined;
  }

  getVoiceProfileByAgentId(agentId: number): VoiceProfile | undefined {
    const stmt = this.db.prepare('SELECT * FROM voice_profiles WHERE agent_id = ?');
    return stmt.get(agentId) as VoiceProfile | undefined;
  }

  updateVoiceProfile(id: number, dto: UpdateVoiceProfileDTO): VoiceProfile | undefined {
    const fields: string[] = [];
    const values: any[] = [];

    if (dto.voiceName !== undefined) {
      fields.push('voice_name = ?');
      values.push(dto.voiceName);
    }
    if (dto.voiceGender !== undefined) {
      fields.push('voice_gender = ?');
      values.push(dto.voiceGender);
    }
    if (dto.voiceAge !== undefined) {
      fields.push('voice_age = ?');
      values.push(dto.voiceAge);
    }
    if (dto.basePitch !== undefined) {
      fields.push('base_pitch = ?');
      values.push(dto.basePitch);
    }
    if (dto.baseSpeed !== undefined) {
      fields.push('base_speed = ?');
      values.push(dto.baseSpeed);
    }
    if (dto.baseVolume !== undefined) {
      fields.push('base_volume = ?');
      values.push(dto.baseVolume);
    }
    if (dto.ttsProvider !== undefined) {
      fields.push('tts_provider = ?');
      values.push(dto.ttsProvider);
    }

    if (fields.length === 0) return this.getVoiceProfileById(id);

    fields.push('updated_at = strftime(\'%s\', \'now\')');
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE voice_profiles SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return this.getVoiceProfileById(id);
  }

  // ==================== VoiceCache ====================

  createVoiceCache(
    messageId: number,
    contentHash: string,
    data: Partial<VoiceCache>
  ): VoiceCache {
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

    return this.getVoiceCacheById(result.lastInsertRowid as number)!;
  }

  getVoiceCacheById(id: number): VoiceCache | undefined {
    const stmt = this.db.prepare('SELECT * FROM voice_cache WHERE id = ?');
    return stmt.get(id) as VoiceCache | undefined;
  }

  getVoiceCacheByMessageId(messageId: number): VoiceCache | undefined {
    const stmt = this.db.prepare('SELECT * FROM voice_cache WHERE message_id = ?');
    return stmt.get(messageId) as VoiceCache | undefined;
  }

  getVoiceCacheByContentHash(contentHash: string): VoiceCache | undefined {
    const stmt = this.db.prepare('SELECT * FROM voice_cache WHERE content_hash = ?');
    return stmt.get(contentHash) as VoiceCache | undefined;
  }

  incrementVoiceCacheAccess(id: number): void {
    const stmt = this.db.prepare(`
      UPDATE voice_cache
      SET access_count = access_count + 1,
          last_accessed_at = strftime('%s', 'now')
      WHERE id = ?
    `);
    stmt.run(id);
  }

  // ==================== VoiceSettings ====================

  getVoiceSettingsByUserId(userId: string): VoiceSettings | undefined {
    try {
      const stmt = this.db.prepare('SELECT * FROM voice_settings WHERE user_id = ?');
      const result = stmt.get(userId) as VoiceSettings | undefined;

      // 如果数据库中没有，尝试从 localStorage 读取
      if (!result) {
        return getLocalStorageSettings(userId);
      }

      // 同步到 localStorage（确保数据一致性）
      setLocalStorageSettings(userId, result);
      return result;
    } catch (error) {
      console.warn('[VoiceRepository] Database error, falling back to localStorage:', error);
      return getLocalStorageSettings(userId);
    }
  }

  createOrUpdateVoiceSettings(userId: string, dto: UpdateVoiceSettingsDTO): VoiceSettings {
    try {
      const existing = this.getVoiceSettingsByUserId(userId);

      if (existing) {
        const updated = this.updateVoiceSettings(existing.id, dto)!;

        // 同步到 localStorage
        setLocalStorageSettings(userId, updated);
        return updated;
      }

      const stmt = this.db.prepare(`
        INSERT INTO voice_settings (
          user_id, auto_play, default_volume, playback_speed,
          voice_enabled, background_play, auto_advance, preferred_provider
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        userId,
        dto.autoPlay !== undefined ? (dto.autoPlay ? 1 : 0) : 1,
        dto.defaultVolume ?? 0.8,
        dto.playbackSpeed ?? 1.0,
        dto.voiceEnabled !== undefined ? (dto.voiceEnabled ? 1 : 0) : 1,
        dto.backgroundPlay !== undefined ? (dto.backgroundPlay ? 1 : 0) : 0,
        dto.autoAdvance !== undefined ? (dto.autoAdvance ? 1 : 0) : 1,
        dto.preferredProvider ?? 'aliyun'
      );

      const settings = this.getVoiceSettingsById(result.lastInsertRowid as number)!;

      // 同步到 localStorage
      setLocalStorageSettings(userId, settings);
      return settings;
    } catch (error) {
      console.warn('[VoiceRepository] Database error, falling back to localStorage:', error);

      // 创建默认设置并保存到 localStorage
      const fallbackSettings: VoiceSettings = {
        id: Date.now(),
        userId,
        autoPlay: dto.autoPlay ?? true,
        defaultVolume: dto.defaultVolume ?? 0.8,
        playbackSpeed: dto.playbackSpeed ?? 1.0,
        voiceEnabled: dto.voiceEnabled ?? true,
        backgroundPlay: dto.backgroundPlay ?? false,
        autoAdvance: dto.autoAdvance ?? true,
        preferredProvider: dto.preferredProvider ?? 'aliyun',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setLocalStorageSettings(userId, fallbackSettings);
      return fallbackSettings;
    }
  }

  private getVoiceSettingsById(id: number): VoiceSettings | undefined {
    const stmt = this.db.prepare('SELECT * FROM voice_settings WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return undefined;

    return {
      ...row,
      autoPlay: row.auto_play === 1,
      voiceEnabled: row.voice_enabled === 1,
      backgroundPlay: row.background_play === 1,
      autoAdvance: row.auto_advance === 1,
    };
  }

  private updateVoiceSettings(id: number, dto: UpdateVoiceSettingsDTO): VoiceSettings | undefined {
    const fields: string[] = [];
    const values: any[] = [];

    if (dto.autoPlay !== undefined) {
      fields.push('auto_play = ?');
      values.push(dto.autoPlay ? 1 : 0);
    }
    if (dto.defaultVolume !== undefined) {
      fields.push('default_volume = ?');
      values.push(dto.defaultVolume);
    }
    if (dto.playbackSpeed !== undefined) {
      fields.push('playback_speed = ?');
      values.push(dto.playbackSpeed);
    }
    if (dto.voiceEnabled !== undefined) {
      fields.push('voice_enabled = ?');
      values.push(dto.voiceEnabled ? 1 : 0);
    }
    if (dto.backgroundPlay !== undefined) {
      fields.push('background_play = ?');
      values.push(dto.backgroundPlay ? 1 : 0);
    }
    if (dto.autoAdvance !== undefined) {
      fields.push('auto_advance = ?');
      values.push(dto.autoAdvance ? 1 : 0);
    }
    if (dto.preferredProvider !== undefined) {
      fields.push('preferred_provider = ?');
      values.push(dto.preferredProvider);
    }

    if (fields.length === 0) return this.getVoiceSettingsById(id);

    fields.push('updated_at = strftime(\'%s\', \'now\')');
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE voice_settings SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return this.getVoiceSettingsById(id);
  }

  // ==================== EmotionAnalysis ====================

  createEmotionAnalysis(
    messageId: number,
    analysis: EmotionAnalysisResult & { modelUsed: string }
  ): EmotionAnalysis {
    const stmt = this.db.prepare(`
      INSERT INTO emotion_analyses (
        message_id, emotion_type, emotion_intensity,
        pitch_shift, speed_multiplier, volume_boost,
        reasoning, confidence, model_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      messageId,
      analysis.emotionType,
      analysis.emotionIntensity,
      analysis.pitchShift,
      analysis.speedMultiplier,
      analysis.volumeBoost,
      analysis.reasoning || null,
      analysis.confidence,
      analysis.modelUsed
    );

    return this.getEmotionAnalysisById(result.lastInsertRowid as number)!;
  }

  getEmotionAnalysisById(id: number): EmotionAnalysis | undefined {
    const stmt = this.db.prepare('SELECT * FROM emotion_analyses WHERE id = ?');
    return stmt.get(id) as EmotionAnalysis | undefined;
  }

  getEmotionAnalysisByMessageId(messageId: number): EmotionAnalysis | undefined {
    const stmt = this.db.prepare('SELECT * FROM emotion_analyses WHERE message_id = ?');
    return stmt.get(messageId) as EmotionAnalysis | undefined;
  }

  // ==================== PlaybackSession ====================

  createPlaybackSession(
    sessionId: string,
    userId: string,
    debateId: number,
    playlist: number[],
    repeatMode: 'none' | 'all' | 'one',
    shuffle: boolean
  ): PlaybackSession {
    const stmt = this.db.prepare(`
      INSERT INTO playback_sessions (
        session_id, debate_id, user_id, playlist, repeat_mode, shuffle
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      sessionId,
      debateId,
      userId,
      JSON.stringify(playlist),
      repeatMode,
      shuffle ? 1 : 0
    );

    return this.getPlaybackSessionById(result.lastInsertRowid as number)!;
  }

  getPlaybackSessionById(id: number): PlaybackSession | undefined {
    const stmt = this.db.prepare('SELECT * FROM playback_sessions WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return undefined;

    return {
      ...row,
      playlist: JSON.parse(row.playlist),
      shuffle: row.shuffle === 1,
    };
  }

  getPlaybackSessionBySessionId(sessionId: string): PlaybackSession | undefined {
    const stmt = this.db.prepare('SELECT * FROM playback_sessions WHERE session_id = ?');
    const row = stmt.get(sessionId) as any;
    if (!row) return undefined;

    return {
      ...row,
      playlist: JSON.parse(row.playlist),
      shuffle: row.shuffle === 1,
    };
  }

  updatePlaybackSession(
    id: number,
    updates: Partial<Omit<PlaybackSession, 'id' | 'createdAt' | 'playlist'>>
  ): PlaybackSession | undefined {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.currentMessageId !== undefined) {
      fields.push('current_message_id = ?');
      values.push(updates.currentMessageId);
    }
    if (updates.currentPosition !== undefined) {
      fields.push('current_position = ?');
      values.push(updates.currentPosition);
    }
    if (updates.shuffle !== undefined) {
      fields.push('shuffle = ?');
      values.push(updates.shuffle ? 1 : 0);
    }

    if (fields.length > 0) {
      fields.push('updated_at = strftime(\'%s\', \'now\')');
      values.push(id);

      const stmt = this.db.prepare(`
        UPDATE playback_sessions SET ${fields.join(', ')} WHERE id = ?
      `);
      stmt.run(...values);
    }

    return this.getPlaybackSessionById(id);
  }

  getPlaybackSessionByDebateAndUser(
    debateId: number,
    userId: string
  ): PlaybackSession | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM playback_sessions
      WHERE debate_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const row = stmt.get(debateId, userId) as any;
    if (!row) return undefined;

    return {
      ...row,
      playlist: JSON.parse(row.playlist),
      shuffle: row.shuffle === 1,
    };
  }

  deletePlaybackSession(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM playback_sessions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}
