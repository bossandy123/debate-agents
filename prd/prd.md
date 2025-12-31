# 多模型 Agent 辩论系统 — 产品级 Spec

## 1. 项目目标（Goal）

构建一个 **多模型、多角色的 Agent 辩论引擎**：

* 输入正反辩题
* 不同大模型分别扮演辩手
* 在严格规则下进行多轮辩论
* 由裁判 Agent + 多观众 Agent 评判
* 输出 **胜负 + 可解释复盘**

定位不是娱乐 Demo，而是：

* 思维对抗引擎
* 决策推演工具
* 认知偏好模拟器

---

## 2. 核心设计原则（非做不可）

1. **强规则 > 文采**
2. **回合制 > 一次性输出**
3. **裁判是系统中权力最大的 Agent**
4. **结果必须可解释、可复盘、可存档**

---

## 3. Agent 角色定义

### 3.1 DebaterAgent（辩手）

* 每个辩手绑定一个模型实例
* 立场固定（Pro / Con）
* 只能基于当前回合上下文发言

属性：

* `agent_id`
* `model_provider`（OpenAI / Claude / Gemini / DeepSeek）
* `model_name`
* `stance`（pro | con）
* `style_tag`（理性 / 激进 / 保守 / 技术派）

能力约束：

* 必须引用对方论点才能反驳
* 禁止引入新主论点（仅限指定回合）

---

### 3.2 JudgeAgent（裁判）【系统核心】

职责：

* 控制流程
* 判定犯规
* 每回合评分
* 最终裁决

评分维度（标准化）：

* 逻辑一致性（logic）
* 针对性反驳（rebuttal）
* 表达清晰度（clarity）
* 论证有效性（evidence）

输出结构（强制 JSON）：

```json
{
  "round": 2,
  "scores": {
    "pro": {"logic": 7.5, "rebuttal": 6.0},
    "con": {"logic": 6.0, "rebuttal": 8.0}
  },
  "foul": false,
  "comment": "反方精准回应核心论点"
}
```

---

### 3.3 AudienceAgent（观众）【多实例】

* 不是裁判
* 有明确偏好
* 只在最终阶段投票

典型观众类型：

* 理性逻辑派
* 现实可行性派
* 技术前瞻派
* 风险厌恶派
* 情绪共鸣派

投票输出：

```json
{
  "agent_id": "aud_03",
  "vote": "pro",
  "confidence": 0.78,
  "reason": "正方更符合现实约束"
}
```

---

### 3.4 ModeratorAgent（主持 / 调度）

职责：

* 调度 Agent
* 控制上下文窗口
* 写入数据库
* 保证顺序与完整性

---

## 4. 辩论流程（Workflow Spec）

> 本版本采用：**正反方各 1 名主辩 + 观众有限下场机制**

---

### Phase 0：初始化

输入：

* 辩题
* 正反立场定义
* 主辩模型配置
* 观众 Agent 构成与权重
* 最大回合数（固定 10 轮）

生成：

* Debate Session
* 主辩 Agent（Pro / Con）
* 观众池（Audience Pool）

---

### Phase 1：立场构建（Round 1–2）

* 每轮顺序：Pro → Con
* 允许提出核心论点（<= 3 条）
* 禁止观众下场

裁判重点评估：

* 立场清晰度
* 论点完整性

---

### Phase 2：对抗与拉盟友（Round 3–6）

* 主辩必须回应对方至少 1 个明确论点
* 允许：

  * 观众申请下场（每轮最多 1 人）
  * 主辩主动向观众求援

#### 观众申请下场规则

观众需提交结构化申请：

```json
{
  "intent": "support_pro | support_con",
  "claim": "核心补充观点",
  "novelty": "new | reinforcement",
  "confidence": 0.0
}
```

裁判判定标准：

* 是否引入新信息
* 是否避免重复
* 是否打破当前论证平衡

通过后：

* 观众仅获得 **1 次发言权**
* 发言内容计入正式辩论记录

---

#### 主辩求援规则

主辩可提交求援请求：

```json
{
  "request": "technical | ethical | practical",
  "target_audience": "audience_type",
  "reason": "求援理由"
}
```

规则约束：

* 连续两轮不可求援
* 求援成功率影响裁判评分（依赖惩罚）

---

### Phase 3：关键战役（Round 7–8）

* 大多数观众已消耗发言权
* 禁止新观众申请下场
* 允许主辩引用已下场观众观点

裁判重点：

* 整合能力
* 对关键证据的掌控

---

### Phase 4：终局攻防（Round 9）

* 禁止求援
* 禁止新观点
* 仅允许压缩与攻击对方漏洞

---

### Phase 5：总结陈词（Round 10）

* 各主辩总结
* 允许情绪定调
* 不允许新增事实

---

### Phase 6：裁决与终局投票

* 裁判输出完整评分与评语
* 全体观众投票（一次性）
* 计算加权结果并产出胜者

---

## 5. 实时输出要求

系统必须支持**实时流式输出**模式：
* 用户能够在辩论进行中实时看到每个Agent的发言内容
* Agent生成内容时立即推送给用户，而不是等待完整生成后才展示
* 类似观看直播的体验，用户可以实时跟随辩论进程

---

## 6. SQLite 数据库设计

### 6.1 debates

```sql
CREATE TABLE debates (
  id INTEGER PRIMARY KEY,
  topic TEXT,
  created_at DATETIME
);
```

### 6.2 agents

```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  role TEXT,
  model_provider TEXT,
  model_name TEXT,
  stance TEXT
);
```

### 6.3 rounds

```sql
CREATE TABLE rounds (
  id INTEGER PRIMARY KEY,
  debate_id INTEGER,
  round_type TEXT,
  sequence INTEGER
);
```

### 6.4 messages

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  round_id INTEGER,
  agent_id TEXT,
  content TEXT,
  created_at DATETIME
);
```

### 6.5 scores

```sql
CREATE TABLE scores (
  round_id INTEGER,
  agent_id TEXT,
  logic REAL,
  rebuttal REAL,
  clarity REAL,
  evidence REAL
);
```

### 6.6 votes

```sql
CREATE TABLE votes (
  audience_id TEXT,
  debate_id INTEGER,
  vote TEXT,
  weight REAL
);
```

---

## 7. 多模型集合辩论机制

* 每个模型 = 独立人格
* 不做 ensemble averaging
* **保留分歧** 才有价值

模型配置说明：
* 正方和反方各配置1个主辩模型（如：正方使用GPT-4.x，反方使用Claude）
* 裁判Agent使用独立模型，不与辩手相同
* 观众Agent可使用多种模型以体现不同认知偏好

裁判建议使用：
* 不参与辩论的模型
* 或规则极强 Prompt 的 GPT

---

## 8. 最终输出（产品级）

1. 胜负结果
2. 关键转折回合
3. 决胜论点
4. 双方盲点
5. 不同观众视角的分歧

---

## 9. 非目标（刻意不做）

* 不追求语言优美
* 不做实时语音
* 不做单模型自辩

---

## 10. 进阶方向（为未来留钩子）

* 人类观众混入
* 历史辩题 replay
* Agent 记忆演化
* 非 Transformer 模型接入

---

**一句话总结**：

> 这是一个“认知对抗系统”，不是聊天系统。