# 实施计划：多模型Agent辩论系统

**分支**: `001-multi-agent-debate` | **日期**: 2025-12-31 | **规格**: [spec.md](./spec.md)
**输入**: 来自 `/specs/001-multi-agent-debate/spec.md` 的功能规格说明

**注意**: 本模板由 `/speckit.plan` 命令填充。执行流程参见 `.specify/templates/commands/plan.md`。

## 摘要

构建一个多模型、多角色的Agent辩论引擎，支持正反方辩手Agent、裁判Agent和观众Agent在严格规则下进行10轮辩论，最终产生可解释的胜负结果和复盘报告。

**核心功能**：
- 辩手Agent（正反各1名）使用不同大模型进行辩论对抗
- 裁判Agent每轮评分并判定犯规
- 观众Agent（5种类型）可在指定回合下场支持或响应求援
- 最终裁决与投票，输出完整复盘报告

## 技术上下文

**语言/版本**: Node.js 20+ (LTS)
**主要依赖**: LangChain.js + LangGraph.js
**存储**: SQLite (better-sqlite3)
**测试**: Jest + ts-mockito
**目标平台**: Linux/macOS 服务器
**项目类型**: single（单项目）
**性能目标**: 10分钟内完成完整10轮辩论（含裁决）
**约束**: p95 < 30000ms/轮，内存 < 500MB，并发10场辩论
**规模/Scope**: 支持10场并发辩论，每场10轮，每轮多个Agent参与

## 宪法检查

*关卡：Phase 0研究前必须通过。Phase 1设计后重新检查。*

- **代码质量**: TypeScript严格类型检查，Jest测试覆盖关键路径，ESLint零错误
- **用户体验一致性**: 统一API响应格式，200ms内反馈，中文错误消息
- **性能要求**: 单轮<30s，内存<500MB，完整辩论<10分钟
- **文档语言**: 所有文档（spec, plan, tasks）使用中文

无违规项。

## 项目结构

### 文档结构（本功能）

```text
specs/001-multi-agent-debate/
├── spec.md              # 功能规格说明
├── plan.md              # 本文件（/speckit.plan命令输出）
├── research.md          # Phase 0输出
├── data-model.md        # Phase 1输出
├── quickstart.md        # Phase 1输出
├── contracts/           # Phase 1输出
│   └── api-schema.yaml  # OpenAPI 3.0规范
└── tasks.md             # Phase 2输出（/speckit.tasks命令创建）
```

### 源代码结构（仓库根目录）

```text
src/
├── agents/              # Agent定义和工厂
│   ├── base.ts          # Agent基类
│   ├── debater.ts       # 辩手Agent
│   ├── judge.ts         # 裁判Agent
│   ├── audience.ts      # 观众Agent
│   └── factory.ts       # Agent工厂
├── models/              # 数据模型
│   ├── debate.ts        # 辩论会话
│   ├── agent.ts         # Agent配置
│   ├── round.ts         # 回合
│   ├── message.ts       # 消息
│   ├── score.ts         # 评分
│   └── vote.ts          # 投票
├── services/            # 业务服务
│   ├── debate-service.ts    # 辩论流程编排
│   ├── round-service.ts     # 回合管理
│   ├── scoring-service.ts   # 评分服务
│   ├── storage-service.ts   # 数据持久化
│   └── llm-service.ts       # LLM调用服务
├── repositories/        # 数据访问层
│   ├── debate.repository.ts
│   ├── message.repository.ts
│   └── score.repository.ts
├── db/                  # 数据库
│   ├── schema.sql       # 数据库Schema
│   └── connection.ts    # SQLite连接
├── utils/               # 工具函数
│   ├── context.ts       # 上下文管理
│   ├── retry.ts         # 重试逻辑
│   └── logger.ts        # 日志工具
├── types/               # TypeScript类型定义
│   └── index.ts
└── index.ts             # 主入口

tests/
├── unit/                # 单元测试
│   ├── agents/
│   ├── services/
│   └── models/
├── integration/         # 集成测试
│   ├── debate-flow.test.ts
│   └── api.test.ts
└── fixtures/            # 测试数据
    └── topics.json
```

**结构决策**: 采用单项目结构（Option 1），所有辩论逻辑集中在一个TypeScript项目中。使用分层架构（models/services/repositories）分离业务逻辑和数据访问。

## Phase 0: 研究任务（已完成）

### 技术决策结果

1. **Agent框架选择**: ✅ LangChain.js + LangGraph.js
   - 决策理由：显式状态机模型、LangSmith可观测性、成熟生态系统
   - 详细分析参见 [research.md](./research.md)

2. **LLM提供商集成**: ✅ LangChain统一抽象层
   - 支持：OpenAI、Anthropic、Google、DeepSeek
   - 重试策略：最多3次，指数退避

3. **上下文管理策略**: ✅ 摘要压缩 + 关键信息提取
   - 早期轮次在Round 7时压缩为摘要
   - 裁判Agent可获得完整历史

4. **并发辩论处理**: ✅ 辩论级别隔离 + SQLite行级锁
   - 每场辩论独立会话ID和状态图
   - WAL模式支持并发读

## Phase 1: 设计输出（已完成）

### 已生成文档

1. ✅ **research.md** - 技术选型研究结果
2. ✅ **data-model.md** - 完整数据模型设计（8张表）
3. ✅ **contracts/api-schema.yaml** - OpenAPI 3.0规范
4. ✅ **quickstart.md** - 快速开始指南

### Agent上下文更新

✅ 已运行 `update-agent-context.sh claude`，已创建 `CLAUDE.md` 文件。
