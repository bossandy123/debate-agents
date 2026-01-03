-- 001: 创建语音功能相关表
-- Feature: 001-voice-emotion
-- Date: 2026-01-02

-- 1. 语音配置表（Agent 级别）
CREATE TABLE IF NOT EXISTS voice_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL,
  agent_type TEXT NOT NULL,  -- 'debater' | 'judge' | 'audience'
  voice_name TEXT NOT NULL DEFAULT 'default',
  voice_gender TEXT,  -- 'male' | 'female'
  voice_age TEXT,  -- 'young' | 'middle' | 'mature'
  base_pitch REAL DEFAULT 1.0,  -- 0.5 - 2.0
  base_speed REAL DEFAULT 1.0,  -- 0.5 - 2.0
  base_volume REAL DEFAULT 1.0,  -- 0.0 - 1.0
  tts_provider TEXT DEFAULT 'aliyun',  -- 'aliyun' | 'doubao' | 'tencent'
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_voice_profiles_agent_id ON voice_profiles(agent_id);

-- 2. 语音缓存表（消息级别）
CREATE TABLE IF NOT EXISTS voice_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL UNIQUE,
  content_hash TEXT NOT NULL,
  emotion_type TEXT NOT NULL,  -- 'intense' | 'neutral' | 'calm'
  emotion_intensity REAL NOT NULL DEFAULT 0.5,  -- 0.0 - 1.0
  audio_url TEXT NOT NULL,
  audio_format TEXT NOT NULL DEFAULT 'mp3',  -- 'mp3' | 'wav' | 'opus'
  file_size INTEGER NOT NULL,
  duration REAL NOT NULL,  -- 秒
  tts_provider TEXT NOT NULL,
  generation_time REAL NOT NULL,  -- 秒
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  expires_at INTEGER,
  access_count INTEGER DEFAULT 0,
  last_accessed_at INTEGER,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_voice_cache_message_id ON voice_cache(message_id);
CREATE INDEX IF NOT EXISTS idx_voice_cache_content_hash ON voice_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_voice_cache_expires_at ON voice_cache(expires_at);

-- 3. 用户语音设置表（用户级别）
CREATE TABLE IF NOT EXISTS voice_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  auto_play BOOLEAN DEFAULT 1,  -- SQLite 使用 0/1
  default_volume REAL DEFAULT 0.8,  -- 0.0 - 1.0
  playback_speed REAL DEFAULT 1.0,  -- 0.5 - 2.0
  voice_enabled BOOLEAN DEFAULT 1,
  background_play BOOLEAN DEFAULT 0,
  auto_advance BOOLEAN DEFAULT 1,
  preferred_provider TEXT DEFAULT 'aliyun',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_voice_settings_user_id ON voice_settings(user_id);

-- 4. 情绪分析结果表（消息级别）
CREATE TABLE IF NOT EXISTS emotion_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL UNIQUE,
  emotion_type TEXT NOT NULL,  -- 'intense' | 'neutral' | 'calm'
  emotion_intensity REAL NOT NULL DEFAULT 0.5,  -- 0.0 - 1.0
  pitch_shift REAL DEFAULT 1.0,  -- 0.5 - 2.0
  speed_multiplier REAL DEFAULT 1.0,  -- 0.5 - 2.0
  volume_boost REAL DEFAULT 1.0,  -- 0.0 - 2.0
  reasoning TEXT,
  confidence REAL NOT NULL DEFAULT 0.5,  -- 0.0 - 1.0
  model_used TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_emotion_analyses_message_id ON emotion_analyses(message_id);
CREATE INDEX IF NOT EXISTS idx_emotion_analyses_emotion_type ON emotion_analyses(emotion_type);

-- 5. 播放会话表（复盘报告连续播放）
CREATE TABLE IF NOT EXISTS playback_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  debate_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',  -- 'idle' | 'playing' | 'paused' | 'stopped'
  current_message_id INTEGER,
  playlist TEXT NOT NULL,  -- JSON 数组: [messageId1, messageId2, ...]
  current_position INTEGER DEFAULT 0,  -- 秒
  repeat_mode TEXT DEFAULT 'none',  -- 'none' | 'all' | 'one'
  shuffle BOOLEAN DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playback_sessions_session_id ON playback_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_playback_sessions_debate_id ON playback_sessions(debate_id);
CREATE INDEX IF NOT EXISTS idx_playback_sessions_user_id ON playback_sessions(user_id);
