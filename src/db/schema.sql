-- 多模型Agent辩论系统数据库Schema
-- SQLite 数据库定义

-- 辩论会话表
CREATE TABLE IF NOT EXISTS debates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'completed', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  winner TEXT CHECK(winner IN ('pro', 'con', 'draw')),
  error_message TEXT
);

-- Agent配置表
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  debate_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('debater', 'judge', 'audience')),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  stance TEXT CHECK(stance IN ('pro', 'con')),
  style_tag TEXT,
  config TEXT NOT NULL, -- JSON配置
  FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE
);

-- 回合表
CREATE TABLE IF NOT EXISTS rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  debate_id INTEGER NOT NULL,
  round_num INTEGER NOT NULL CHECK(round_num BETWEEN 1 AND 10),
  phase TEXT NOT NULL CHECK(phase IN ('opening', 'rebuttal', 'critical', 'closing', 'summary')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed')),
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE
);

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK(message_type IN ('argument', 'rebuttal', 'judge_comment', 'audience_support', 'help_request')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- 评分表
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  logic REAL NOT NULL CHECK(logic BETWEEN 0 AND 10),
  rebuttal REAL NOT NULL CHECK(rebuttal BETWEEN 0 AND 10),
  clarity REAL NOT NULL CHECK(clarity BETWEEN 0 AND 10),
  evidence REAL NOT NULL CHECK(evidence BETWEEN 0 AND 10),
  total REAL NOT NULL,
  comment TEXT,
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- 观众下场申请表
CREATE TABLE IF NOT EXISTS audience_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  intent TEXT NOT NULL CHECK(intent IN ('support_pro', 'support_con')),
  claim TEXT NOT NULL,
  novelty TEXT NOT NULL CHECK(novelty IN ('new', 'reinforcement')),
  confidence REAL NOT NULL CHECK(confidence BETWEEN 0 AND 1),
  status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
  judge_comment TEXT,
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- 求援请求表
CREATE TABLE IF NOT EXISTS help_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK(request_type IN ('technical', 'ethical', 'practical')),
  target_audience TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'granted', 'denied')),
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- 观众投票表
CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  debate_id INTEGER NOT NULL,
  audience_id TEXT NOT NULL,
  vote TEXT NOT NULL CHECK(vote IN ('pro', 'con')),
  confidence REAL NOT NULL CHECK(confidence BETWEEN 0 AND 1),
  reason TEXT,
  voted_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE
);

-- 查询优化索引
CREATE INDEX IF NOT EXISTS idx_agents_debate ON agents(debate_id);
CREATE INDEX IF NOT EXISTS idx_rounds_debate ON rounds(debate_id);
CREATE INDEX IF NOT EXISTS idx_messages_round ON messages(round_id);
CREATE INDEX IF NOT EXISTS idx_scores_round ON scores(round_id);
CREATE INDEX IF NOT EXISTS idx_votes_debate ON votes(debate_id);
CREATE INDEX IF NOT EXISTS idx_audience_requests_round ON audience_requests(round_id);

-- 状态查询索引
CREATE INDEX IF NOT EXISTS idx_debates_status ON debates(status);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON rounds(status);
