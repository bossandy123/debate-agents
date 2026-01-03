# Phase 1: 数据模型设计

**Feature**: 001-voice-emotion
**Date**: 2026-01-02
**Status**: Completed

---

## 数据库表结构

### 1. voice_profiles - 语音配置表

存储每个 Agent（辩手、裁判、观众）的语音配置。

```sql
CREATE TABLE voice_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL,                    -- 关联的 Agent ID
  agent_type TEXT NOT NULL,                     -- Agent 类型: 'debater' | 'judge' | 'audience'
  voice_name TEXT NOT NULL DEFAULT 'default',   -- 语音名称（TTS服务商提供的音色ID）
  voice_gender TEXT,                            -- 性别: 'male' | 'female'
  voice_age TEXT,                               -- 年龄段: 'young' | 'middle' | 'mature'
  base_pitch REAL DEFAULT 1.0,                  -- 基础音高 (0.5-2.0)
  base_speed REAL DEFAULT 1.0,                  -- 基础语速 (0.5-2.0)
  base_volume REAL DEFAULT 1.0,                 -- 基础音量 (0.0-1.0)
  tts_provider TEXT DEFAULT 'doubao',          -- TTS 提供商: 'doubao' | 'aliyun' | 'tencent'
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX idx_voice_profiles_agent_id ON voice_profiles(agent_id);
```

**验证规则**：
- `base_pitch`, `base_speed`, `base_volume` 必须在有效范围内
- `tts_provider` 必须是支持的提供商之一
- `voice_name` 必须是对应提供商支持的有效音色ID

**默认配置**：
```json
{
  "debater_pro": {
    "voice_name": "zh_male_mature",
    "voice_gender": "male",
    "voice_age": "mature",
    "base_pitch": 1.0,
    "base_speed": 1.0,
    "base_volume": 1.0
  },
  "debater_con": {
    "voice_name": "zh_female_young",
    "voice_gender": "female",
    "voice_age": "young",
    "base_pitch": 1.1,
    "base_speed": 1.0,
    "base_volume": 1.0
  },
  "judge": {
    "voice_name": "zh_male_professional",
    "voice_gender": "male",
    "voice_age": "middle",
    "base_pitch": 0.9,
    "base_speed": 0.9,
    "base_volume": 1.0
  }
}
```

---

### 2. voice_cache - 语音缓存表

存储已生成的语音文件元数据。

```sql
CREATE TABLE voice_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL UNIQUE,           -- 关联的消息 ID
  content_hash TEXT NOT NULL,                   -- 内容哈希（用于去重）
  emotion_type TEXT NOT NULL,                   -- 情绪类型: 'intense' | 'neutral' | 'calm'
  emotion_intensity REAL NOT NULL DEFAULT 0.5,  -- 情绪强度 (0.0-1.0)
  audio_url TEXT NOT NULL,                      -- 音频文件 URL（OSS 或本地路径）
  audio_format TEXT NOT NULL DEFAULT 'mp3',     -- 音频格式: 'mp3' | 'wav' | 'opus'
  file_size INTEGER NOT NULL,                   -- 文件大小（字节）
  duration REAL NOT NULL,                       -- 音频时长（秒）
  tts_provider TEXT NOT NULL,                   -- 使用的 TTS 提供商
  generation_time REAL NOT NULL,                -- 生成耗时（秒）
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  expires_at INTEGER,                           -- 过期时间（NULL 表示永不过期）
  access_count INTEGER DEFAULT 0,               -- 访问次数
  last_accessed_at INTEGER,                     -- 最后访问时间
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX idx_voice_cache_message_id ON voice_cache(message_id);
CREATE INDEX idx_voice_cache_content_hash ON voice_cache(content_hash);
CREATE INDEX idx_voice_cache_created_at ON voice_cache(created_at);
CREATE INDEX idx_voice_cache_expires_at ON voice_cache(expires_at);
```

**验证规则**：
- `content_hash` 使用 SHA-256 算法
- `emotion_intensity` 必须在 0.0-1.0 范围内
- `file_size` 和 `duration` 必须 > 0

---

### 3. voice_settings - 用户语音设置表

存储用户的全局语音偏好设置。

```sql
CREATE TABLE voice_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,                 -- 用户 ID（使用浏览器指纹或 UUID）
  auto_play BOOLEAN DEFAULT true,               -- 自动播放开关
  default_volume REAL DEFAULT 0.8,              -- 默认音量 (0.0-1.0)
  playback_speed REAL DEFAULT 1.0,              -- 播放速度 (0.5-2.0)
  voice_enabled BOOLEAN DEFAULT true,           -- 语音功能全局开关
  background_play BOOLEAN DEFAULT false,        -- 后台播放开关
  auto_advance BOOLEAN DEFAULT true,            -- 自动播放下一条
  preferred_provider TEXT DEFAULT 'doubao',    -- 首选 TTS 提供商
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_voice_settings_user_id ON voice_settings(user_id);
```

**验证规则**：
- `default_volume` 必须在 0.0-1.0 范围内
- `playback_speed` 必须在 0.5-2.0 范围内

---

### 4. emotion_analyses - 情绪分析结果表

存储对发言内容的情绪分析结果。

```sql
CREATE TABLE emotion_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL UNIQUE,           -- 关联的消息 ID
  emotion_type TEXT NOT NULL,                   -- 主情绪: 'intense' | 'neutral' | 'calm'
  emotion_intensity REAL NOT NULL DEFAULT 0.5,  -- 情绪强度 (0.0-1.0)
  pitch_shift REAL DEFAULT 1.0,                 -- 音高调整 (0.5-2.0)
  speed_multiplier REAL DEFAULT 1.0,            -- 语速倍数 (0.5-2.0)
  volume_boost REAL DEFAULT 1.0,                -- 音量增强 (0.0-2.0)
  reasoning TEXT,                               -- 判断依据（调试用）
  confidence REAL NOT NULL DEFAULT 0.5,         -- 分析置信度 (0.0-1.0)
  model_used TEXT NOT NULL,                     -- 使用的模型
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX idx_emotion_analyses_message_id ON emotion_analyses(message_id);
CREATE INDEX idx_emotion_analyses_emotion_type ON emotion_analyses(emotion_type);
```

**验证规则**：
- 所有参数必须在有效范围内
- `confidence` 必须 >= 0.0 且 <= 1.0

---

### 5. playback_sessions - 播放会话表

记录连续播放的状态（用于复盘报告页面的连续播放功能）。

```sql
CREATE TABLE playback_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,              -- 会话 ID（UUID）
  debate_id INTEGER NOT NULL,                   -- 关联的辩论 ID
  user_id TEXT NOT NULL,                        -- 用户 ID
  status TEXT NOT NULL DEFAULT 'idle',         -- 状态: 'idle' | 'playing' | 'paused' | 'stopped'
  current_message_id INTEGER,                   -- 当前播放的消息 ID
  playlist TEXT NOT NULL,                       -- 播放列表（JSON 数组: [messageId1, messageId2, ...]）
  current_position INTEGER DEFAULT 0,           -- 当前播放位置（秒）
  repeat_mode TEXT DEFAULT 'none',              -- 重复模式: 'none' | 'all' | 'one'
  shuffle BOOLEAN DEFAULT false,                -- 是否随机播放
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE
);

CREATE INDEX idx_playback_sessions_session_id ON playback_sessions(session_id);
CREATE INDEX idx_playback_sessions_debate_id ON playback_sessions(debate_id);
CREATE INDEX idx_playback_sessions_user_id ON playback_sessions(user_id);
```

**验证规则**：
- `status` 必须是有效的状态值
- `playlist` 必须是有效的 JSON 数组

---

## 数据关系图

```
┌─────────────────┐
│     agents      │
│  (existing)     │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       voice_profiles                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │voice_name│ │voice_gender│ │base_pitch│ │base_speed│ │tts_provider│ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│    messages     │
│   (existing)    │
└────────┬────────┘
         │
         ├──────────────────────────────────────────────┐
         │                                              │
         ▼                                              ▼
┌─────────────────────────┐               ┌─────────────────────────┐
│    emotion_analyses     │               │      voice_cache        │
│  ┌──────────────────┐   │               │  ┌──────────────────┐  │
│  │emotion_type      │   │               │  │audio_url         │  │
│  │emotion_intensity │   │               │  │file_size         │  │
│  │pitch_shift       │   │               │  │duration          │  │
│  └──────────────────┘   │               │  └──────────────────┘  │
└─────────────────────────┘               └─────────────────────────┘
                                                       │
                                                       ▼
                                         ┌─────────────────────────┐
                                         │      OSS / 本地存储      │
                                         │      (音频文件)         │
                                         └─────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       voice_settings                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │auto_play │ │volume    │ │speed     │ │enabled   │ │provider  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      playback_sessions                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │status    │ │playlist  │ │position  │ │repeat    │ │shuffle   │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## TypeScript 类型定义

```typescript
// voice_profiles.ts
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
  ttsProvider: 'doubao' | 'aliyun' | 'tencent';
  createdAt: number;
  updatedAt: number;
}

// voice_cache.ts
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

// voice_settings.ts
export interface VoiceSettings {
  id: number;
  userId: string;
  autoPlay: boolean;
  defaultVolume: number;    // 0.0 - 1.0
  playbackSpeed: number;    // 0.5 - 2.0
  voiceEnabled: boolean;
  backgroundPlay: boolean;
  autoAdvance: boolean;
  preferredProvider: 'doubao' | 'aliyun' | 'tencent';
  createdAt: number;
  updatedAt: number;
}

// emotion_analyses.ts
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

// playback_sessions.ts
export interface PlaybackSession {
  id: number;
  sessionId: string;
  debateId: number;
  userId: string;
  status: 'idle' | 'playing' | 'paused' | 'stopped';
  currentMessageId?: number;
  playlist: number[];        // Array of message IDs
  currentPosition: number;   // Seconds
  repeatMode: 'none' | 'all' | 'one';
  shuffle: boolean;
  createdAt: number;
  updatedAt: number;
}
```

---

## 数据迁移脚本

```sql
-- 001_create_voice_tables.sql

-- 创建语音配置表
CREATE TABLE IF NOT EXISTS voice_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL,
  agent_type TEXT NOT NULL,
  voice_name TEXT NOT NULL DEFAULT 'default',
  voice_gender TEXT,
  voice_age TEXT,
  base_pitch REAL DEFAULT 1.0,
  base_speed REAL DEFAULT 1.0,
  base_volume REAL DEFAULT 1.0,
  tts_provider TEXT DEFAULT 'doubao',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- 创建语音缓存表
CREATE TABLE IF NOT EXISTS voice_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL UNIQUE,
  content_hash TEXT NOT NULL,
  emotion_type TEXT NOT NULL,
  emotion_intensity REAL NOT NULL DEFAULT 0.5,
  audio_url TEXT NOT NULL,
  audio_format TEXT NOT NULL DEFAULT 'mp3',
  file_size INTEGER NOT NULL,
  duration REAL NOT NULL,
  tts_provider TEXT NOT NULL,
  generation_time REAL NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  expires_at INTEGER,
  access_count INTEGER DEFAULT 0,
  last_accessed_at INTEGER,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- 创建用户语音设置表
CREATE TABLE IF NOT EXISTS voice_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  auto_play BOOLEAN DEFAULT true,
  default_volume REAL DEFAULT 0.8,
  playback_speed REAL DEFAULT 1.0,
  voice_enabled BOOLEAN DEFAULT true,
  background_play BOOLEAN DEFAULT false,
  auto_advance BOOLEAN DEFAULT true,
  preferred_provider TEXT DEFAULT 'doubao',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- 创建情绪分析表
CREATE TABLE IF NOT EXISTS emotion_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL UNIQUE,
  emotion_type TEXT NOT NULL,
  emotion_intensity REAL NOT NULL DEFAULT 0.5,
  pitch_shift REAL DEFAULT 1.0,
  speed_multiplier REAL DEFAULT 1.0,
  volume_boost REAL DEFAULT 1.0,
  reasoning TEXT,
  confidence REAL NOT NULL DEFAULT 0.5,
  model_used TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- 创建播放会话表
CREATE TABLE IF NOT EXISTS playback_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  debate_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  current_message_id INTEGER,
  playlist TEXT NOT NULL,
  current_position INTEGER DEFAULT 0,
  repeat_mode TEXT DEFAULT 'none',
  shuffle BOOLEAN DEFAULT false,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_voice_profiles_agent_id ON voice_profiles(agent_id);
CREATE INDEX IF NOT EXISTS idx_voice_cache_message_id ON voice_cache(message_id);
CREATE INDEX IF NOT EXISTS idx_voice_cache_content_hash ON voice_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_voice_cache_expires_at ON voice_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_voice_settings_user_id ON voice_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_emotion_analyses_message_id ON emotion_analyses(message_id);
CREATE INDEX IF NOT EXISTS idx_playback_sessions_session_id ON playback_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_playback_sessions_debate_id ON playback_sessions(debate_id);
```

---

## 数据清理策略

```typescript
// 定期清理过期缓存
export async function cleanExpiredCache() {
  const db = await getDatabase();
  const now = Math.floor(Date.now() / 1000);

  // 删除超过 30 天未访问的缓存
  const result = db.execute(`
    DELETE FROM voice_cache
    WHERE expires_at IS NOT NULL AND expires_at < ?
      OR (last_accessed_at < ? AND access_count < 5)
  `, [now, now - 30 * 24 * 3600]);

  console.log(`Cleaned ${result.changes} expired voice cache entries`);
}

// 清理超过 7 天的播放会话
export async function cleanOldSessions() {
  const db = await getDatabase();
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;

  const result = db.execute(`
    DELETE FROM playback_sessions
    WHERE created_at < ? AND status = 'stopped'
  `, [sevenDaysAgo]);

  console.log(`Cleaned ${result.changes} old playback sessions`);
}
```
