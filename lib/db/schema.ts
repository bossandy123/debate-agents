import Database from "better-sqlite3";

/**
 * 初始化数据库 Schema
 * 创建所有必需的表、索引和约束
 */
export function initSchema(db: Database.Database): void {
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
