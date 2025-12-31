# Data Model

**Feature**: 多模型 Agent 辩论系统
**Date**: 2025-12-31
**Status**: Phase 1 Complete

## 概述

本文档定义了多模型 Agent 辩论系统的数据模型，包括所有实体、属性、关系和验证规则。

---

## 实体关系图 (ERD)

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   debates   │───────1│   agents    │N────────│   votes     │
│             │         │             │         │             │
│ - id        │         │ - id        │         │ - agent_id  │
│ - topic     │         │ - role      │         │ - debate_id │
│ - status    │         │ - model     │         │ - vote      │
│ - created_at│         │ - stance    │         │ - confidence│
└─────────────┘         │ - config    │         │ - reason    │
       │                └─────────────┘         └─────────────┘
       │                       │
       │ N                     │ N
       │                       │
┌─────────────┐         ┌─────────────┐
│   rounds    │         │  messages   │
│             │         │             │
│ - id        │         │ - id        │
│ - debate_id │         │ - round_id  │
│ - sequence  │         │ - agent_id  │
│ - phase     │         │ - content   │
│ - type      │         │ - created_at│
└─────────────┘         └─────────────┘
       │
       │ 1
       │
       │ N
┌─────────────┐
│   scores    │
│             │
│ - round_id  │
│ - agent_id  │
│ - logic     │
│ - rebuttal  │
│ - clarity   │
│ - evidence  │
└─────────────┘
```

---

## 核心实体定义

### 1. debates (辩论会话)

辩论会话是系统的核心实体，代表一次完整的辩论活动。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 唯一标识符 |
| topic | TEXT | NOT NULL | 辩题 |
| pro_definition | TEXT | | 正方立场定义 |
| con_definition | TEXT | | 反方立场定义 |
| max_rounds | INTEGER | NOT NULL DEFAULT 10 | 最大轮数 |
| judge_weight | REAL | NOT NULL DEFAULT 0.5 | 裁判评分权重 (0-1) |
| audience_weight | REAL | NOT NULL DEFAULT 0.5 | 观众投票权重 (0-1) |
| status | TEXT | NOT NULL | 状态: pending/running/completed/failed |
| winner | TEXT | | 胜方: pro/con/draw |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 (ISO 8601) |
| started_at | TEXT | | 开始时间 (ISO 8601) |
| completed_at | TEXT | | 完成时间 (ISO 8601) |

**验证规则**:
- `judge_weight + audience_weight = 1.0`
- `max_rounds` 必须为正整数
- `status` 只能为: `pending`, `running`, `completed`, `failed`

**状态转换**:
```
pending → running → completed
    ↓         ↓
  failed    failed
```

---

### 2. agents (代理配置)

Agent 配置表，记录参与辩论的所有 AI 角色。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | 唯一标识符 (UUID) |
| debate_id | INTEGER | NOT NULL, FOREIGN KEY(debates.id) | 所属辩论 |
| role | TEXT | NOT NULL | 角色: debater/judge/audience/moderator |
| stance | TEXT | | 立场: pro/con/null (仅 debater 需要) |
| model_provider | TEXT | NOT NULL | 模型提供商: openai/anthropic/google/deepseek |
| model_name | TEXT | NOT NULL | 模型名称: gpt-4/claude-3/gemini-pro |
| style_tag | TEXT | | 风格标签: rational/aggressive/conservative/technical (仅 debater) |
| audience_type | TEXT | | 观众类型: rational/pragmatic/technical/risk-averse/emotional (仅 audience) |
| config | TEXT | | 额外配置 (JSON 字符串) |

**验证规则**:
- `role` 只能为: `debater`, `judge`, `audience`, `moderator`
- 当 `role = debater` 时，`stance` 必须为 `pro` 或 `con`
- 当 `role = audience` 时，`audience_type` 必须指定
- 一个辩论只能有 2 个 debater (1 pro, 1 con)
- 一个辩论只能有 1 个 judge
- 一个辩论可以有多个 audience

---

### 3. rounds (辩论轮次)

辩论轮次表，记录每一轮的基本信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 唯一标识符 |
| debate_id | INTEGER | NOT NULL, FOREIGN KEY(debates.id) | 所属辩论 |
| sequence | INTEGER | NOT NULL | 轮次序号 (1-10) |
| phase | TEXT | NOT NULL | 阶段: opening/rebuttal/closing |
| type | TEXT | NOT NULL | 类型: standard/audience_request/finale |
| started_at | TEXT | | 开始时间 |
| completed_at | TEXT | | 完成时间 |

**阶段定义**:
| 轮次 | Phase | 说明 |
|------|-------|------|
| 1-2 | opening | 开篇立论 |
| 3-6 | rebuttal | 反驳与拉盟友 |
| 7-8 | rebuttal | 关键战役 |
| 9 | rebuttal | 终局攻防 |
| 10 | closing | 总结陈词 |

**唯一约束**: `(debate_id, sequence)` - 每个辩论的轮次序号唯一

---

### 4. messages (发言记录)

发言记录表，记录每个 Agent 在每轮的发言内容。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 唯一标识符 |
| round_id | INTEGER | NOT NULL, FOREIGN KEY(rounds.id) | 所属轮次 |
| agent_id | TEXT | NOT NULL, FOREIGN KEY(agents.id) | 发言 Agent |
| content | TEXT | NOT NULL | 发言内容 |
| token_count | INTEGER | | Token 数量 (估算) |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 发言时间 |

**发言顺序**: 同一轮内，messages 按 `created_at` 排序

---

### 5. scores (评分记录)

评分记录表，记录裁判对每个 Agent 在每轮的评分。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| round_id | INTEGER | NOT NULL, FOREIGN KEY(rounds.id) | 所属轮次 |
| agent_id | TEXT | NOT NULL, FOREIGN KEY(agents.id) | 被评分 Agent |
| logic | REAL | NOT NULL | 逻辑一致性 (0-10) |
| rebuttal | REAL | NOT NULL | 针对性反驳 (0-10) |
| clarity | REAL | NOT NULL | 表达清晰度 (0-10) |
| evidence | REAL | NOT NULL | 论证有效性 (0-10) |
| comment | TEXT | | 裁判评论 |

**唯一约束**: `(round_id, agent_id)` - 每轮每个 Agent 只有一条评分

**评分范围**: 所有维度均为 0-10，保留 1 位小数

---

### 6. votes (观众投票)

观众投票表，记录观众 Agent 在辩论结束后的投票。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| agent_id | TEXT | NOT NULL, FOREIGN KEY(agents.id) | 投票观众 |
| debate_id | INTEGER | NOT NULL, FOREIGN KEY(debates.id) | 所属辩论 |
| vote | TEXT | NOT NULL | 投票立场: pro/con/draw |
| confidence | REAL | NOT NULL | 置信度 (0-1) |
| reason | TEXT | | 投票理由 |

**唯一约束**: `(agent_id, debate_id)` - 每个观众对每个辩论只能投票一次

---

### 7. audience_requests (观众申请记录)

观众申请下场发言的记录表。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 唯一标识符 |
| round_id | INTEGER | NOT NULL, FOREIGN KEY(rounds.id) | 申请轮次 |
| agent_id | TEXT | NOT NULL, FOREIGN KEY(agents.id) | 申请观众 |
| intent | TEXT | NOT NULL | 意图: support_pro/support_con |
| claim | TEXT | NOT NULL | 核心观点 |
| novelty | TEXT | NOT NULL | 新颖性: new/reinforcement |
| confidence | REAL | NOT NULL | 置信度 (0-1) |
| approved | BOOLEAN | NOT NULL DEFAULT false | 是否获批 |
| judge_comment | TEXT | | 裁判评论 |

**约束**: 只在第 3-6 轮允许观众申请

---

## 索引设计

```sql
-- debates 表索引
CREATE INDEX idx_debates_status ON debates(status);
CREATE INDEX idx_debates_created ON debates(created_at DESC);

-- agents 表索引
CREATE INDEX idx_agents_debate ON agents(debate_id);
CREATE INDEX idx_agents_role ON agents(role);

-- rounds 表索引
CREATE INDEX idx_rounds_debate ON rounds(debate_id);
CREATE UNIQUE INDEX idx_rounds_sequence ON rounds(debate_id, sequence);

-- messages 表索引
CREATE INDEX idx_messages_round ON messages(round_id);
CREATE INDEX idx_messages_agent ON messages(agent_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- scores 表索引
CREATE UNIQUE INDEX idx_scores_round_agent ON scores(round_id, agent_id);

-- votes 表索引
CREATE UNIQUE INDEX idx_votes_agent_debate ON votes(agent_id, debate_id);

-- audience_requests 表索引
CREATE INDEX idx_requests_round ON audience_requests(round_id);
CREATE INDEX idx_requests_approved ON audience_requests(approved);
```

---

## TypeScript 类型定义

```typescript
// ============== debates ==============
interface Debate {
  id: number;
  topic: string;
  pro_definition?: string;
  con_definition?: string;
  max_rounds: number;
  judge_weight: number;
  audience_weight: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  winner?: 'pro' | 'con' | 'draw';
  created_at: string; // ISO 8601
  started_at?: string;
  completed_at?: string;
}

interface CreateDebateInput {
  topic: string;
  pro_definition?: string;
  con_definition?: string;
  max_rounds?: number;
  judge_weight?: number;
  audience_weight?: number;
}

// ============== agents ==============
interface Agent {
  id: string; // UUID
  debate_id: number;
  role: 'debater' | 'judge' | 'audience' | 'moderator';
  stance?: 'pro' | 'con';
  model_provider: 'openai' | 'anthropic' | 'google' | 'deepseek';
  model_name: string;
  style_tag?: 'rational' | 'aggressive' | 'conservative' | 'technical';
  audience_type?: 'rational' | 'pragmatic' | 'technical' | 'risk-averse' | 'emotional';
  config?: Record<string, unknown>;
}

interface CreateAgentInput {
  debate_id: number;
  role: Agent['role'];
  stance?: Agent['stance'];
  model_provider: Agent['model_provider'];
  model_name: string;
  style_tag?: Agent['style_tag'];
  audience_type?: Agent['audience_type'];
  config?: Record<string, unknown>;
}

// ============== rounds ==============
interface Round {
  id: number;
  debate_id: number;
  sequence: number; // 1-10
  phase: 'opening' | 'rebuttal' | 'closing';
  type: 'standard' | 'audience_request' | 'finale';
  started_at?: string;
  completed_at?: string;
}

// ============== messages ==============
interface Message {
  id: number;
  round_id: number;
  agent_id: string;
  content: string;
  token_count?: number;
  created_at: string;
}

// ============== scores ==============
interface Score {
  round_id: number;
  agent_id: string;
  logic: number; // 0-10
  rebuttal: number; // 0-10
  clarity: number; // 0-10
  evidence: number; // 0-10
  comment?: string;
}

interface ScoreSummary {
  logic: number;
  rebuttal: number;
  clarity: number;
  evidence: number;
  total: number;
}

// ============== votes ==============
interface Vote {
  agent_id: string;
  debate_id: number;
  vote: 'pro' | 'con' | 'draw';
  confidence: number; // 0-1
  reason?: string;
}

// ============== audience_requests ==============
interface AudienceRequest {
  id: number;
  round_id: number;
  agent_id: string;
  intent: 'support_pro' | 'support_con';
  claim: string;
  novelty: 'new' | 'reinforcement';
  confidence: number;
  approved: boolean;
  judge_comment?: string;
}

// ============== SSE Events ==============
interface SSEEvent {
  type: 'round_start' | 'message_start' | 'message_token' | 'message_end' |
        'score_update' | 'round_end' | 'debate_end' | 'error';
  data: unknown;
  timestamp: string;
}

interface MessageTokenEvent {
  type: 'message_token';
  data: {
    round_id: number;
    agent_id: string;
    agent_name: string;
    token: string;
  };
  timestamp: string;
}

interface ScoreUpdateEvent {
  type: 'score_update';
  data: {
    round_id: number;
    scores: Record<string, Score>;
  };
  timestamp: string;
}
```

---

## 数据完整性约束

### 外键约束

```sql
ALTER TABLE agents ADD FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE;
ALTER TABLE rounds ADD FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE;
ALTER TABLE messages ADD FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE;
ALTER TABLE messages ADD FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;
ALTER TABLE scores ADD FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE;
ALTER TABLE scores ADD FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;
ALTER TABLE votes ADD FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;
ALTER TABLE votes ADD FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE;
ALTER TABLE audience_requests ADD FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE;
ALTER TABLE audience_requests ADD FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;
```

### 检查约束

```sql
-- debates
ALTER TABLE debates ADD CHECK (judge_weight + audience_weight = 1.0);
ALTER TABLE debates ADD CHECK (max_rounds > 0);
ALTER TABLE debates ADD CHECK (status IN ('pending', 'running', 'completed', 'failed'));

-- scores
ALTER TABLE scores ADD CHECK (logic BETWEEN 0 AND 10);
ALTER TABLE scores ADD CHECK (rebuttal BETWEEN 0 AND 10);
ALTER TABLE scores ADD CHECK (clarity BETWEEN 0 AND 10);
ALTER TABLE scores ADD CHECK (evidence BETWEEN 0 AND 10);

-- votes
ALTER TABLE votes ADD CHECK (confidence BETWEEN 0 AND 1);
ALTER TABLE votes ADD CHECK (vote IN ('pro', 'con', 'draw'));

-- audience_requests
ALTER TABLE audience_requests ADD CHECK (confidence BETWEEN 0 AND 1);
ALTER TABLE audience_requests ADD CHECK (intent IN ('support_pro', 'support_con'));
ALTER TABLE audience_requests ADD CHECK (novelty IN ('new', 'reinforcement'));
```

---

## 数据迁移策略

### 初始化

```typescript
// lib/db/schema.ts
import Database from 'better-sqlite3';

export function initSchema(db: Database.Database) {
  db.exec(`
    -- debates 表
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

    -- agents 表
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

    -- rounds 表
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

    -- messages 表
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

    -- scores 表
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

    -- votes 表
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

    -- audience_requests 表
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

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_debates_status ON debates(status);
    CREATE INDEX IF NOT EXISTS idx_agents_debate ON agents(debate_id);
    CREATE INDEX IF NOT EXISTS idx_rounds_debate ON rounds(debate_id);
    CREATE INDEX IF NOT EXISTS idx_messages_round ON messages(round_id);
  `);
}
```

### 版本控制

使用 migrations 目录管理 schema 变更：

```
lib/db/migrations/
├── 001_initial_schema.sql
├── 002_add_audience_requests.sql
└── 003_add_indexes.sql
```

---

## 数据清理策略

### 归档功能

将旧辩论导出为 JSON：

```typescript
export interface DebateArchive {
  debate: Debate;
  agents: Agent[];
  rounds: Round[];
  messages: Message[];
  scores: Score[];
  votes: Vote[];
  audience_requests: AudienceRequest[];
}
```

### 自动清理

提供 CLI 命令清理超过 30 天的辩论：

```bash
npm run db:cleanup -- --days=30
```
