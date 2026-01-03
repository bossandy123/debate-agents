import Database from "better-sqlite3";

/**
 * 初始化数据库 Schema
 * 创建所有必需的表、索引和约束
 */
export function initSchema(db: Database.Database): void {
  // 首先尝试添加新列（用于迁移现有数据库）
  migrateAgentsTable(db);

  // debates 表 - 辩论会话
  db.exec(`
    CREATE TABLE IF NOT EXISTS debates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      pro_definition TEXT,
      con_definition TEXT,
      max_rounds INTEGER NOT NULL DEFAULT 10,
      judge_weight REAL NOT NULL DEFAULT 0.5,
      audience_weight REAL NOT NULL DEFAULT 0.5,
      status TEXT NOT NULL DEFAULT 'pending',
      winner TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT,
      CHECK (judge_weight + audience_weight = 1.0),
      CHECK (max_rounds > 0),
      CHECK (status IN ('pending', 'running', 'completed', 'failed'))
    );
  `);

  // agents 表 - 代理配置
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      debate_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      stance TEXT,
      model_provider TEXT NOT NULL,
      model_name TEXT NOT NULL,
      api_key TEXT,
      base_url TEXT,
      style_tag TEXT,
      audience_type TEXT,
      config TEXT,
      FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE
    );
  `);

  // rounds 表 - 辩论轮次
  db.exec(`
    CREATE TABLE IF NOT EXISTS rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      debate_id INTEGER NOT NULL,
      sequence INTEGER NOT NULL,
      phase TEXT NOT NULL,
      type TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE,
      UNIQUE (debate_id, sequence)
    );
  `);

  // messages 表 - 发言记录
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_id INTEGER NOT NULL,
      agent_id TEXT NOT NULL,
      content TEXT NOT NULL,
      token_count INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );
  `);

  // scores 表 - 评分记录
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      round_id INTEGER NOT NULL,
      agent_id TEXT NOT NULL,
      logic REAL NOT NULL,
      rebuttal REAL NOT NULL,
      clarity REAL NOT NULL,
      evidence REAL NOT NULL,
      comment TEXT,
      FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
      UNIQUE (round_id, agent_id),
      CHECK (logic BETWEEN 0 AND 10),
      CHECK (rebuttal BETWEEN 0 AND 10),
      CHECK (clarity BETWEEN 0 AND 10),
      CHECK (evidence BETWEEN 0 AND 10)
    );
  `);

  // votes 表 - 观众投票
  db.exec(`
    CREATE TABLE IF NOT EXISTS votes (
      agent_id TEXT NOT NULL,
      debate_id INTEGER NOT NULL,
      vote TEXT NOT NULL,
      confidence REAL NOT NULL,
      reason TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
      FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE,
      UNIQUE (agent_id, debate_id),
      CHECK (confidence BETWEEN 0 AND 1),
      CHECK (vote IN ('pro', 'con', 'draw'))
    );
  `);

  // audience_requests 表 - 观众申请记录
  db.exec(`
    CREATE TABLE IF NOT EXISTS audience_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_id INTEGER NOT NULL,
      agent_id TEXT NOT NULL,
      intent TEXT NOT NULL,
      claim TEXT NOT NULL,
      novelty TEXT NOT NULL,
      confidence REAL NOT NULL,
      approved BOOLEAN NOT NULL DEFAULT 0,
      judge_comment TEXT,
      FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
      CHECK (confidence BETWEEN 0 AND 1),
      CHECK (intent IN ('support_pro', 'support_con')),
      CHECK (novelty IN ('new', 'reinforcement'))
    );
  `);

  // 创建索引
  createIndexes(db);

  // 创建语音功能相关表（Feature: 001-voice-emotion）
  initVoiceSchema(db);
}

/**
 * 初始化语音功能相关表
 * Feature: 001-voice-emotion
 */
function initVoiceSchema(db: Database.Database): void {
  // 1. 语音配置表（Agent 级别）
  db.exec(`
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
      tts_provider TEXT DEFAULT 'aliyun',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_voice_profiles_agent_id ON voice_profiles(agent_id);`);

  // 2. 语音缓存表（消息级别）
  db.exec(`
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
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_voice_cache_message_id ON voice_cache(message_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_voice_cache_content_hash ON voice_cache(content_hash);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_voice_cache_expires_at ON voice_cache(expires_at);`);

  // 3. 用户语音设置表（用户级别）
  db.exec(`
    CREATE TABLE IF NOT EXISTS voice_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL UNIQUE,
      auto_play INTEGER DEFAULT 1,
      default_volume REAL DEFAULT 0.8,
      playback_speed REAL DEFAULT 1.0,
      voice_enabled INTEGER DEFAULT 1,
      background_play INTEGER DEFAULT 0,
      auto_advance INTEGER DEFAULT 1,
      preferred_provider TEXT DEFAULT 'aliyun',
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_voice_settings_user_id ON voice_settings(user_id);`);

  // 4. 情绪分析结果表（消息级别）
  db.exec(`
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
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_emotion_analyses_message_id ON emotion_analyses(message_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_emotion_analyses_emotion_type ON emotion_analyses(emotion_type);`);

  // 5. 播放会话表（复盘报告连续播放）
  db.exec(`
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
      shuffle INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_playback_sessions_session_id ON playback_sessions(session_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_playback_sessions_debate_id ON playback_sessions(debate_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_playback_sessions_user_id ON playback_sessions(user_id);`);

  console.log('[VoiceSchema] Voice tables initialized successfully');
}

/**
 * 创建数据库索引以优化查询性能
 */
function createIndexes(db: Database.Database): void {
  // debates 表索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_debates_status ON debates(status);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_debates_created ON debates(created_at DESC);`);

  // agents 表索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_agents_debate ON agents(debate_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role);`);

  // rounds 表索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_rounds_debate ON rounds(debate_id);`);

  // messages 表索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_round ON messages(round_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_agent ON messages(agent_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);`);

  // votes 表索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_votes_debate ON votes(debate_id);`);
}

/**
 * 验证数据库完整性
 */
export function validateSchema(db: Database.Database): boolean {
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    )
    .all() as { name: string }[];

  const requiredTables = [
    "debates",
    "agents",
    "rounds",
    "messages",
    "scores",
    "votes",
    "audience_requests",
  ];

  const existingTables = new Set(tables.map((t) => t.name));

  for (const table of requiredTables) {
    if (!existingTables.has(table)) {
      return false;
    }
  }

  return true;
}

/**
 * 迁移 agents 表，添加 api_key 和 base_url 列
 * 用于支持自定义 LLM 端点和 API 密钥
 */
function migrateAgentsTable(db: Database.Database): void {
  try {
    // 检查列是否已存在
    const columns = db.pragma("table_info(agents)") as Array<{ name: string }>;
    const columnNames = new Set(columns.map((c) => c.name));

    // 添加 api_key 列
    if (!columnNames.has("api_key")) {
      db.exec("ALTER TABLE agents ADD COLUMN api_key TEXT;");
      console.log("Added api_key column to agents table");
    }

    // 添加 base_url 列
    if (!columnNames.has("base_url")) {
      db.exec("ALTER TABLE agents ADD COLUMN base_url TEXT;");
      console.log("Added base_url column to agents table");
    }
  } catch (error) {
    // 列可能已存在或其他错误，忽略
    console.debug("Migration note:", (error as Error).message);
  }
}
