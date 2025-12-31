# 任务列表：多模型Agent辩论系统

**输入**: 来自 `/specs/001-multi-agent-debate/` 的设计文档
**前置条件**: plan.md（必需）、spec.md（必需）、data-model.md、research.md、contracts/

**测试**: 本功能的规格说明要求关键路径有测试覆盖（QR-003），因此以下任务包含测试。

**组织方式**: 任务按用户故事分组，使每个故事可以独立实现和测试。

## 格式: `[ID] [P?] [Story] 描述`

- **[P]**: 可并行运行（不同文件，无依赖）
- **[Story]**: 该任务所属的用户故事（如US1、US2、US3）
- 包含精确文件路径

## 路径约定

- 单项目: `src/`、`tests/` 位于仓库根目录

---

## Phase 1: 基础设施（共享）

**目的**: 项目初始化和基本结构

- [X] T001 创建项目目录结构 src/{agents,models,services,repositories,db,utils,types} 和 tests/{unit,integration,fixtures}
- [X] T002 [P] 初始化 TypeScript 项目，配置 tsconfig.json（strict: true, noImplicitAny: true）
- [X] T003 [P] 安装核心依赖：@langchain/core、@langchain/openai、@langchain/anthropic、@langchain/google、better-sqlite3
- [X] T004 [P] 配置 ESLint（使用推荐的 TypeScript 规则）和 Prettier
- [X] T005 [P] 配置 Jest 测试框架和 ts-mockito
- [X] T006 [P] 创建 .env.example 文件，包含 LLM API 密钥模板
- [X] T007 创建数据库 schema.sql 文件，包含 8 张表（debates, agents, rounds, messages, scores, audience_requests, help_requests, votes）
- [X] T008 [P] 创建 db/connection.ts，实现 SQLite 连接和 WAL 模式配置
- [X] T009 [P] 创建 utils/logger.ts，实现中文日志工具
- [X] T010 [P] 创建 utils/retry.ts，实现重试逻辑（最多 3 次，指数退避）
- [X] T011 创建 types/index.ts，定义所有 TypeScript 接口（Debate, Agent, Round, Message, Score, AudienceRequest, HelpRequest, Vote）

---

## Phase 2: 基础设施（阻塞性前置条件）

**目的**: 所有用户故事依赖的核心基础设施

**⚠️ 关键**: 在任何用户故事可以开始之前，此阶段必须完成

- [X] T012 创建 db/schema.ts，实现数据库初始化和迁移逻辑
- [X] T013 创建 repositories/debate.repository.ts，实现辩论的 CRUD 操作
- [X] T014 [P] 创建 repositories/message.repository.ts，实现消息的查询和插入
- [X] T015 [P] 创建 repositories/score.repository.ts，实现评分的查询和插入
- [X] T016 创建 services/llm-service.ts，实现 LangChain 统一抽象层和错误处理
- [X] T017 创建 utils/context.ts，实现上下文管理和摘要压缩策略
- [X] T018 创建 agents/base.ts，定义 Agent 基类和配置接口
- [X] T019 创建 agents/factory.ts，实现 Agent 工厂（支持 debater/judge/audience）

**检查点**: 基础设施就绪 - 用户故事实现现在可以并行开始

---

## Phase 3: 用户故事 1 - 发起一场辩论 (优先级: P1) 🎯 MVP

**目标**: 实现完整的 10 轮辩论流程，从输入辩题到输出胜负结果和复盘报告

**独立测试**: 输入辩题"人工智能是否会取代人类工作"，验证系统能完成从初始化到裁决的完整流程并输出结果

### 用户故事 1 的测试（可选，但规格要求测试覆盖）

> **注意: 先编写这些测试，确保它们失败后再实现**

- [X] T020 [P] [US1] 创建集成测试 tests/integration/debate-flow.test.ts，验证完整 10 轮辩论流程
- [X] T021 [P] [US1] 创建单元测试 tests/unit/services/debate-service.test.ts，验证辩论服务核心逻辑

### 用户故事 1 的实现

- [X] T022 [P] [US1] 创建 models/debate.ts，实现 Debate 模型类
- [X] T023 [P] [US1] 创建 models/round.ts，实现 Round 模型类
- [X] T024 [P] [US1] 创建 models/message.ts，实现 Message 模型类
- [X] T025 [P] [US1] 创建 models/score.ts，实现 Score 模型类
- [X] T026 [US1] 创建 agents/debater.ts，实现辩手 Agent（继承 base.ts）
- [X] T027 [US1] 创建 agents/judge.ts，实现裁判 Agent（继承 base.ts），包含评分和犯规判定逻辑
- [X] T028 [US1] 创建 services/round-service.ts，实现回合管理（状态转换、上下文构建）
- [X] T029 [US1] 创建 services/scoring-service.ts，实现评分服务和胜负计算逻辑
- [X] T030 [US1] 创建 services/debate-service.ts，实现辩论流程编排（10 轮控制、阶段管理）
- [X] T031 [US1] 创建 services/storage-service.ts，实现辩论数据持久化
- [X] T032 [US1] 实现 10 轮辩论流程逻辑：立场构建(Round 1-2)、针对性反驳(Round 3-6)、关键战役(Round 7-8)、终局攻防(Round 9)、总结陈词(Round 10)
- [X] T033 [US1] 实现裁判评分逻辑：逻辑一致性、针对性反驳、表达清晰度、论证有效性
- [X] T034 [US1] 实现最终裁决：加权计算胜者，生成复盘报告（胜负、关键转折回合、决胜论点、双方盲点）
- [X] T035 [US1] 实现 API 调用失败重试机制（最多 3 次）
- [X] T036 [US1] 实现平局判定逻辑（裁判评分权重高于观众）
- [X] T037 [US1] 实现上下文超限处理（摘要压缩历史内容）
- [X] T038 [US1] 添加中文错误消息，确保 UXR-001 要求
- [X] T039 [US1] 创建 API 路由：POST /api/debates（创建辩论）
- [X] T040 [US1] 创建 API 路由：GET /api/debates/:id/status（查询状态，用于轮询进度）
- [X] T041 [US1] 创建 API 路由：GET /api/debates/:id/result（获取结果）
- [X] T042 [US1] 实现 API 响应格式统一（UXR-002）

**检查点**: 此时用户故事 1 应该完全功能化且可独立测试

---

## Phase 4: 用户故事 2 - 观众Agent参与辩论 (优先级: P2)

**目标**: 观众 Agent 可在 Round 3-6 申请下场支持或响应主辩求援

**独立测试**: 验证观众 Agent 能在 Round 3-6 期间申请下场并获裁判批准，以及主辩能成功求援

### 用户故事 2 的测试

- [ ] T043 [P] [US2] 创建集成测试 tests/integration/audience-flow.test.ts，验证观众申请和求援流程
- [ ] T044 [P] [US2] 创建单元测试 tests/unit/services/audience-service.test.ts，验证观众服务逻辑

### 用户故事 2 的实现

- [ ] T045 [P] [US2] 创建 models/vote.ts，实现 Vote 模型类
- [ ] T046 [P] [US2] 创建 agents/audience.ts，实现观众 Agent（5 种类型：理性逻辑派、现实可行性派、技术前瞻派、风险厌恶派、情绪共鸣派）
- [ ] T047 [US2] 实现 Round 3-6 观众申请下场机制（每轮最多 1 名观众）
- [ ] T048 [US2] 实现观众申请逻辑：包含支持立场、核心观点、新颖度、置信度
- [ ] T049 [US2] 实现裁判对观众申请的审批判定（引入新信息、避免重复、打破平衡）
- [ ] T050 [US2] 实现主辩求援机制（技术/伦理/实践类型，指定目标观众类型）
- [ ] T051 [US2] 实现求援限制逻辑：连续两轮不可求援
- [ ] T052 [US2] 实现多个观众同时申请时按时间顺序选择
- [ ] T053 [US2] 实现观众投票逻辑（最终阶段收集所有观众投票）
- [ ] T054 [US2] 集成观众发言到辩论流程（Round 3-6）
- [ ] T055 [US2] 存储观众申请数据到 audience_requests 表
- [ ] T056 [US2] 存储求援请求数据到 help_requests 表
- [ ] T057 [US2] 存储观众投票数据到 votes 表

**检查点**: 此时用户故事 1 和 2 都应独立工作

---

## Phase 5: 用户故事 3 - 查看历史辩论复盘 (优先级: P3)

**目标**: 查看已完成辩论的完整记录，包括发言、评分、投票

**独立测试**: 完成一场辩论后，查询数据库获取完整记录，验证所有数据都被正确保存

### 用户故事 3 的测试

- [ ] T058 [P] [US3] 创建集成测试 tests/integration/history-query.test.ts，验证历史记录查询

### 用户故事 3 的实现

- [ ] T059 [P] [US3] 扩展 repositories/debate.repository.ts，添加历史查询方法
- [ ] T060 [P] [US3] 扩展 repositories/message.repository.ts，添加按回合查询消息方法
- [ ] T061 [P] [US3] 扩展 repositories/score.repository.ts，添加按 Agent 和回合查询评分方法
- [ ] T062 [US3] 创建 API 路由：GET /api/debates/:id（获取完整辩论详情）
- [ ] T063 [US3] 创建 API 路由：GET /api/debates/:id/rounds（获取所有回合）
- [ ] T064 [US3] 创建 API 路由：GET /api/debates/:id/rounds/:roundNum（获取指定回合详情）
- [ ] T065 [US3] 创建 API 路由：GET /api/debates（获取辩论列表，支持分页和状态筛选）
- [ ] T066 [US3] 实现辩论记录查询性能优化（索引已在 schema 中定义）

**检查点**: 所有 3 个用户故事现在都应独立功能化

---

## Phase 6: 收尾与跨功能改进

**目的**: 影响多个用户故事的改进

- [ ] T067 [P] 创建 tests/fixtures/topics.json，添加测试辩题数据
- [ ] T068 [P] 运行所有测试并确保覆盖率满足 QR-003 要求
- [ ] T069 [P] 运行 ESLint 并修复所有警告，确保零错误（QR-004）
- [ ] T070 [P] 运行 TypeScript 类型检查，确保无隐式 any 类型（QR-001）
- [ ] T071 性能优化：确保单轮 < 30s（PR-001）
- [ ] T072 性能优化：确保内存 < 500MB（PR-002）
- [ ] T073 性能优化：确保完整 10 轮辩论 < 10 分钟（PR-004）
- [ ] T074 [P] 编写 API 中文文档（DR-002）
- [ ] T075 更新 README.md，包含快速开始指南
- [ ] T076 验证所有文档使用中文编写（DR-001）

---

## 依赖关系与执行顺序

### 阶段依赖

- **Setup (Phase 1)**: 无依赖 - 可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成 - 阻塞所有用户故事
- **User Stories (Phase 3+)**: 全部依赖 Foundational 阶段完成
  - 用户故事随后可并行进行（如果有足够人员）
  - 或按优先级顺序执行（P1 → P2 → P3）
- **Polish (Phase 6)**: 依赖所有期望的用户故事完成

### 用户故事依赖

- **用户故事 1 (P1)**: Foundational 完成后可开始 - 无其他故事依赖
- **用户故事 2 (P2)**: Foundational 完成后可开始 - 可与 US1 集成但应独立可测
- **用户故事 3 (P3)**: Foundational 完成后可开始 - 可与 US1/US2 集成但应独立可测

### 每个用户故事内

- 测试（如果包含）必须先编写并在实现前失败
- Models → Services → Endpoints → Integration
- 核心实现 → 集成
- 故事完成后方可进入下一优先级

### 并行机会

- Setup 阶段所有标记 [P] 的任务可并行运行
- Foundational 阶段所有标记 [P] 的任务可并行运行（在 Phase 2 内）
- Foundational 完成后，所有用户故事可并行开始（如果团队容量允许）
- 用户故事内所有标记 [P] 的测试可并行运行
- 用户故事内所有标记 [P] 的 models 可并行运行
- 不同用户故事可由不同团队成员并行工作

---

## 并行示例：用户故事 1

```bash
# 一起启动用户故事 1 的所有测试
Task: "创建集成测试 tests/integration/debate-flow.test.ts"
Task: "创建单元测试 tests/unit/services/debate-service.test.ts"

# 一起启动用户故事 1 的所有模型
Task: "创建 models/debate.ts"
Task: "创建 models/round.ts"
Task: "创建 models/message.ts"
Task: "创建 models/score.ts"
```

---

## 实施策略

### MVP 优先（仅用户故事 1）

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（关键 - 阻塞所有故事）
3. 完成 Phase 3: 用户故事 1
4. **停止并验证**: 独立测试用户故事 1
5. 如果就绪则部署/演示

### 增量交付

1. 完成 Setup + Foundational → 基础就绪
2. 添加用户故事 1 → 独立测试 → 部署/演示（MVP!）
3. 添加用户故事 2 → 独立测试 → 部署/演示
4. 添加用户故事 3 → 独立测试 → 部署/演示
5. 每个故事增加价值而不破坏之前的故事

### 并行团队策略

多开发人员时：

1. 团队一起完成 Setup + Foundational
2. Foundational 完成后：
   - 开发者 A: 用户故事 1
   - 开发者 B: 用户故事 2
   - 开发者 C: 用户故事 3
3. 故事独立完成并集成

---

## 备注

- [P] 任务 = 不同文件，无依赖
- [Story] 标签将任务映射到特定用户故事以实现可追溯性
- 每个用户故事应可独立完成和测试
- 在实现前验证测试失败
- 每个任务或逻辑组后提交
- 在任何检查点停止以独立验证故事
- 避免：模糊任务、同一文件冲突、破坏独立性的跨故事依赖
