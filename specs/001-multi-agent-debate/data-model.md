# 数据模型设计

**功能**: 多模型Agent辩论系统
**日期**: 2025-12-31
**存储**: SQLite

## 实体关系图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  debates    │────<│  agents     │>────│  messages   │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │     │ id (PK)     │     │ id (PK)     │
│ topic       │     │ debate_id   │     │ round_id    │
│ status      │     │ role        │     │ agent_id    │
│ created_at  │     │ provider    │     │ content     │
│ winner      │     │ model       │     │ created_at  │
└─────────────┘     │ stance      │     └─────────────┘
                    │ config      │
                    └─────────────┘
                          │
                          v
                   ┌─────────────┐     ┌─────────────┐
                   │  rounds     │────<│  scores     │
                   ├─────────────┤     ├─────────────┤
                   │ id (PK)     │     │ round_id    │
                   │ debate_id   │     │ agent_id    │
                   │ round_num   │     │ logic       │
                   │ phase       │     │ rebuttal    │
                   │ status      │     │ clarity     │
                   └─────────────┘     │ evidence    │
                          │             └─────────────┘
                          v
                   ┌─────────────┐     ┌─────────────┐
                   │ audience_   │     │  votes      │
                   │ requests    │     ├─────────────┤
                   ├─────────────┤     │ debate_id   │
                   │ round_id    │     │ audience_id │
                   │ agent_id    │     │ vote        │
                   │ intent      │     │ confidence  │
                   │ claim       │     │ reason      │
                   │ status      │     └─────────────┘
                   └─────────────┘
```

## 表结构定义

### 1. debates - 辩论会话表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 辩论唯一ID |
| topic | TEXT | NOT NULL | 辩题 |
| status | TEXT | NOT NULL | 状态：pending/active/completed/failed |
| created_at | TEXT | NOT NULL | ISO 8601格式时间戳 |
| completed_at | TEXT | NULL | 完成时间 |
| winner | TEXT | NULL | 胜者：pro/con/draw |
| error_message | TEXT | NULL | 失败原因 |

### 2. agents - Agent配置表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PRIMARY KEY | Agent唯一标识 |
| debate_id | INTEGER | FOREIGN KEY → debates(id) | 所属辩论 |
| role | TEXT | NOT NULL | 角色：debater/judge/audience |
| provider | TEXT | NOT NULL | 模型提供商 |
| model | TEXT | NOT NULL | 模型名称 |
| stance | TEXT | NULL | 立场：pro/con/null(裁判) |
| style_tag | TEXT | NULL | 风格标签：理性/激进/保守/技术派 |
| config | TEXT | NOT NULL | JSON配置（温度、最大token等） |

### 3. rounds - 回合表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 回合唯一ID |
| debate_id | INTEGER | FOREIGN KEY → debates(id) | 所属辩论 |
| round_num | INTEGER | NOT NULL | 回合序号（1-10） |
| phase | TEXT | NOT NULL | 阶段：opening/rebuttal/critical/closing/summary |
| status | TEXT | NOT NULL | 状态：pending/in_progress/completed |
| started_at | TEXT | NULL | 开始时间 |
| completed_at | TEXT | NULL | 完成时间 |

### 4. messages - 消息表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 消息唯一ID |
| round_id | INTEGER | FOREIGN KEY → rounds(id) | 所属回合 |
| agent_id | TEXT | FOREIGN KEY → agents(id) | 发言Agent |
| content | TEXT | NOT NULL | 发言内容 |
| message_type | TEXT | NOT NULL | 类型：argument/rebuttal/judge_comment/audience_support/help_request |
| created_at | TEXT | NOT NULL | 发言时间 |

### 5. scores - 评分表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 评分唯一ID |
| round_id | INTEGER | FOREIGN KEY → rounds(id) | 所属回合 |
| agent_id | TEXT | FOREIGN KEY → agents(id) | 被评分Agent |
| logic | REAL | NOT NULL | 逻辑一致性（0-10） |
| rebuttal | REAL | NOT NULL | 针对性反驳（0-10） |
| clarity | REAL | NOT NULL | 表达清晰度（0-10） |
| evidence | REAL | NOT NULL | 论证有效性（0-10） |
| total | REAL | NOT NULL | 总分 |
| comment | TEXT | NULL | 裁判评语 |

### 6. audience_requests - 观众下场申请表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 申请唯一ID |
| round_id | INTEGER | FOREIGN KEY → rounds(id) | 申请回合 |
| agent_id | TEXT | FOREIGN KEY → agents(id) | 申请观众Agent |
| intent | TEXT | NOT NULL | 意图：support_pro/support_con |
| claim | TEXT | NOT NULL | 核心观点 |
| novelty | TEXT | NOT NULL | 新颖度：new/reinforcement |
| confidence | REAL | NOT NULL | 置信度（0-1） |
| status | TEXT | NOT NULL | 状态：pending/approved/rejected |
| judge_comment | TEXT | NULL | 裁判判定理由 |

### 7. help_requests - 求援请求表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 请求唯一ID |
| round_id | INTEGER | FOREIGN KEY → rounds(id) | 请求回合 |
| agent_id | TEXT | FOREIGN KEY → agents(id) | 请求Agent |
| request_type | TEXT | NOT NULL | 类型：technical/ethical/practical |
| target_audience | TEXT | NOT NULL | 目标观众类型 |
| reason | TEXT | NOT NULL | 求援理由 |
| status | TEXT | NOT NULL | 状态：pending/granted/denied |

### 8. votes - 观众投票表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 投票唯一ID |
| debate_id | INTEGER | FOREIGN KEY → debates(id) | 所属辩论 |
| audience_id | TEXT | NOT NULL | 观众Agent ID |
| vote | TEXT | NOT NULL | 投票：pro/con |
| confidence | REAL | NOT NULL | 置信度（0-1） |
| reason | TEXT | NULL | 投票理由 |
| voted_at | TEXT | NOT NULL | 投票时间 |

## 索引设计

```sql
-- 查询优化索引
CREATE INDEX idx_agents_debate ON agents(debate_id);
CREATE INDEX idx_rounds_debate ON rounds(debate_id);
CREATE INDEX idx_messages_round ON messages(round_id);
CREATE INDEX idx_scores_round ON scores(round_id);
CREATE INDEX idx_votes_debate ON votes(debate_id);
CREATE INDEX idx_audience_requests_round ON audience_requests(round_id);

-- 状态查询索引
CREATE INDEX idx_debates_status ON debates(status);
CREATE INDEX idx_rounds_status ON rounds(status);
```

## 数据完整性约束

```sql
-- 外键约束
FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE
FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
FOREIGN KEY (agent_id) REFERENCES agents(id)

-- 检查约束
CHECK (status IN ('pending', 'active', 'completed', 'failed'))
CHECK (role IN ('debater', 'judge', 'audience'))
CHECK (stance IN ('pro', 'con') OR stance IS NULL)
CHECK (round_num BETWEEN 1 AND 10)
CHECK (logic BETWEEN 0 AND 10)
CHECK (confidence BETWEEN 0 AND 1)
```

## TypeScript类型定义

```typescript
// 核心实体类型
interface Debate {
  id: number;
  topic: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  winner?: 'pro' | 'con' | 'draw';
  error_message?: string;
}

interface Agent {
  id: string;
  debate_id: number;
  role: 'debater' | 'judge' | 'audience';
  provider: 'openai' | 'anthropic' | 'google' | 'deepseek';
  model: string;
  stance?: 'pro' | 'con';
  style_tag?: 'rational' | 'aggressive' | 'conservative' | 'technical';
  config: AgentConfig;
}

interface AgentConfig {
  temperature: number;
  maxTokens: number;
  topP?: number;
}

interface Round {
  id: number;
  debate_id: number;
  round_num: number;
  phase: 'opening' | 'rebuttal' | 'critical' | 'closing' | 'summary';
  status: 'pending' | 'in_progress' | 'completed';
  started_at?: string;
  completed_at?: string;
}

interface Message {
  id: number;
  round_id: number;
  agent_id: string;
  content: string;
  message_type: 'argument' | 'rebuttal' | 'judge_comment' | 'audience_support' | 'help_request';
  created_at: string;
}

interface Score {
  id: number;
  round_id: number;
  agent_id: string;
  logic: number;
  rebuttal: number;
  clarity: number;
  evidence: number;
  total: number;
  comment?: string;
}

interface AudienceRequest {
  id: number;
  round_id: number;
  agent_id: string;
  intent: 'support_pro' | 'support_con';
  claim: string;
  novelty: 'new' | 'reinforcement';
  confidence: number;
  status: 'pending' | 'approved' | 'rejected';
  judge_comment?: string;
}

interface Vote {
  id: number;
  debate_id: number;
  audience_id: string;
  vote: 'pro' | 'con';
  confidence: number;
  reason?: string;
  voted_at: string;
}
```
