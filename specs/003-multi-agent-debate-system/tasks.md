# Tasks: 多模型 Agent 辩论系统

**Input**: Design documents from `/specs/003-multi-agent-debate-system/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-schema.yaml

**Tests**: 本项目包含测试任务，确保代码质量和功能正确性。

**Organization**: 任务按用户故事分组，支持独立实现和测试。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖关系）
- **[Story]**: 所属用户故事（如 US1, US2, US3）
- 包含精确文件路径

## Path Conventions

本项目采用 Next.js 单一应用结构：
- `app/` - Next.js App Router (API 路由和页面)
- `lib/` - 业务逻辑层
- `components/` - React 组件
- `tests/` - 测试文件

---

## Phase 1: Setup (项目初始化) ✅ COMPLETED

**Purpose**: 创建 Next.js 项目基础结构和安装依赖

- [X] T001 创建 Next.js 项目结构 (app/, lib/, components/, tests/ 目录)
- [X] T002 初始化 Next.js 15 项目并安装核心依赖 (next@15, react@19, typescript@5)
- [X] T003 [P] 安装并配置 ESLint 和 Prettier 代码规范工具
- [X] T004 [P] 安装并配置 Tailwind CSS 样式框架
- [X] T005 [P] 初始化 shadcn/ui 组件库配置
- [X] T006 [P] 安装 LangChain 相关依赖 (@langchain/core, @langchain/openai, @langchain/anthropic, @langchain/google-genai)
- [X] T007 [P] 安装数据库依赖 better-sqlite3 和类型定义 @types/better-sqlite3
- [X] T008 [P] 安装表单验证依赖 react-hook-form, @hookform/resolvers, zod
- [X] T009 [P] 安装测试依赖 vitest, @vitest/ui, playwright, @playwright/test
- [X] T010 [P] 安装工具库 date-fns, clsx, tailwind-merge
- [X] T011 创建 .env.local 环境变量模板文件
- [X] T012 配置 tsconfig.json TypeScript 严格模式
- [X] T013 配置 vitest.config.ts 测试配置
- [X] T014 配置 playwright.config.ts E2E 测试配置

---

## Phase 2: Foundational (核心基础设施) ✅ COMPLETED

**Purpose**: 核心基础设施，必须完成后才能开始任何用户故事

**⚠️ CRITICAL**: 在此阶段完成前，不能开始任何用户故事开发

### Database & Models

- [X] T015 实现 lib/db/schema.ts 包含所有表定义 (debates, agents, rounds, messages, scores, votes, audience_requests)
- [X] T016 实现 lib/db/client.ts SQLite 客户端单例和数据库连接管理
- [X] T017 [P] 实现 lib/models/debate.ts Debate 数据模型和类型定义
- [X] T018 [P] 实现 lib/models/agent.ts Agent 数据模型和类型定义
- [X] T019 [P] 实现 lib/models/round.ts Round 数据模型和类型定义
- [X] T020 [P] 实现 lib/models/message.ts Message 数据模型和类型定义
- [X] T021 [P] 实现 lib/models/score.ts Score 数据模型和类型定义
- [X] T022 [P] 实现 lib/models/vote.ts Vote 数据模型和类型定义
- [X] T023 [P] 实现 lib/models/audience-request.ts AudienceRequest 数据模型和类型定义

### Repositories (数据访问层)

- [X] T024 [P] 实现 lib/repositories/debate.repository.ts CRUD 操作
- [X] T025 [P] 实现 lib/repositories/agent.repository.ts CRUD 操作
- [X] T026 [P] 实现 lib/repositories/round.repository.ts CRUD 操作
- [X] T027 [P] 实现 lib/repositories/message.repository.ts CRUD 操作
- [X] T028 [P] 实现 lib/repositories/score.repository.ts CRUD 操作
- [X] T029 [P] 实现 lib/repositories/vote.repository.ts CRUD 操作

### Utilities & Config

- [X] T030 实现 lib/utils/config.ts 环境变量配置管理
- [X] T031 实现 lib/utils/logger.ts 日志工具
- [X] T032 [P] 实现 lib/langchain/config.ts LangChain 模型配置和 createLLM 工厂函数
- [X] T033 [P] 实现 lib/langchain/callbacks.ts LangSmith 追踪回调配置

### Database Setup Endpoint

- [X] T034 实现 app/db/route.ts 数据库初始化 API 端点

**Checkpoint**: ✅ 基础设施完成 - 可以开始用户故事开发

---

## Phase 3: User Story 1 - 发起并配置辩论 (Priority: P1) 🎯 MVP

**Goal**: 用户能够创建辩论会话，配置辩题、模型、观众权重等参数

**Independent Test**: 创建一个简单辩论配置（辩题 + 2个基础模型），验证系统初始化辩论会话并返回会话 ID

### Tests for User Story 1

> **NOTE: 先编写测试确保失败，然后实现功能**

- [X] T035 [P] [US1] Contract test for POST /api/debates in tests/contract/debates.test.ts
- [X] T036 [P] [US1] Integration test for debate creation flow in tests/integration/debate-creation.test.ts

### Implementation for User Story 1

- [X] T037 [P] [US1] 实现 lib/services/sse-service.ts SSE 推送服务核心逻辑
- [X] T038 [US1] 实现 app/api/debates/route.ts POST 创建辩论 API 端点 (依赖 T037)
- [X] T039 [US1] 实现 app/api/debates/route.ts GET 获取辩论列表 API 端点
- [X] T040 [US1] 实现 app/api/debates/[id]/route.ts GET 获取辩论详情 API 端点
- [X] T041 [US1] 实现 app/(web)/create-debate/page.tsx 创建辩论页面
- [X] T042 [US1] 实现 components/debate/debate-config-form.tsx 辩论配置表单组件
- [X] T043 [US1] 实现 app/api/models/route.ts GET 获取可用模型列表 API 端点
- [X] T044 [US1] 添加辩论创建的表单验证和错误处理
- [X] T045 [US1] 添加辩论创建操作的日志记录

**Checkpoint**: ✅ 用户故事 1 完成 - 所有任务已完成

---

## Phase 4: User Story 2 - 执行多轮辩论流程 (Priority: P1)

**Goal**: 系统能够自动调度 Agent 完成 10 轮结构化辩论流程

**Independent Test**: 使用预加载模拟 Agent（固定回复）验证完整的 10 轮辩论流程正确执行

### Tests for User Story 2

- [X] T046 [P] [US2] Contract test for POST /api/debates/[id]/start in tests/contract/debate-start.test.ts
- [X] T047 [P] [US2] Integration test for 10-round debate flow in tests/integration/debate-flow.test.ts

### LangChain Agent 层 (US2 基础)

- [X] T048 [P] [US2] 实现 lib/agents/prompts/debater-prompts.ts 辩手 Prompt 模板
- [X] T049 [P] [US2] 实现 lib/agents/prompts/judge-prompts.ts 裁判 Prompt 模板
- [X] T050 [P] [US2] 实现 lib/agents/prompts/audience-prompts.ts 观众 Prompt 模板
- [X] T051 [P] [US2] 实现 lib/agents/chains/debater-chain.ts 辩手 Chain 实现
- [X] T052 [P] [US2] 实现 lib/agents/chains/judge-chain.ts 裁判 Chain 实现
- [X] T053 [P] [US2] 实现 lib/agents/chains/audience-chain.ts 观众 Chain 实现
- [X] T054 [P] [US2] 实现 lib/agents/tools/score-tool.ts 评分工具
- [X] T055 [P] [US2] 实现 lib/agents/tools/request-tool.ts 观众申请工具
- [X] T056 [US2] 实现 lib/services/memory-service.ts Agent 记忆管理服务 (依赖 T054, T055)

### LangChain 集成服务 (US2 核心)

- [X] T057 [US2] 实现 lib/services/langchain-service.ts LangChain 集成服务，包含 streamChain 和 invokeChain 方法 (依赖 T051, T052, T053, T056)
- [X] T058 [US2] 实现辩论流程 10 轮阶段判断逻辑 (opening/rebuttal/closing)

### 辩论流程编排服务 (US2 核心)

- [X] T059 [US2] 实现 lib/services/debate-service.ts 辩论流程编排服务 (依赖 T037, T057)
- [X] T060 [US2] 实现辩论会话状态管理 (pending → running → completed)
- [X] T061 [US2] 实现单轮辩论执行逻辑 (Pro 发言 → Con 发言 → 裁判评分)
- [X] T062 [US2] 实现观众申请下场发言的审批流程 (第 3-6 轮)
- [X] T063 [US2] 实现 LLM API 调用失败的重试机制
- [X] T064 [US2] 实现超时处理和错误恢复逻辑

### API 端点 (US2 接口)

- [X] T065 [US2] 实现 app/api/debates/[id]/start/route.ts POST 启动辩论 API 端点 (依赖 T059)
- [X] T066 [US2] 实现 app/api/debates/[id]/stop/route.ts POST 停止辩论 API 端点
- [X] T067 [US2] 实现 app/api/debates/[id]/stream/route.ts GET SSE 实时推送端点

**Checkpoint**: ✅ 用户故事 2 完成 - 所有任务已完成（包括观众申请发言功能）

---

## Phase 5: User Story 3 - 裁判评分与裁决 (Priority: P1)

**Goal**: 裁判 Agent 在每轮结束后评分，辩论结束后生成最终裁决

**Independent Test**: 提供预设辩论内容让裁判 Agent 评分，验证评分输出 JSON 结构正确且评分维度合理

### Tests for User Story 3

- [X] T068 [P] [US3] Unit test for judge scoring in tests/unit/chains/judge-chain.test.ts
- [X] T069 [P] [US3] Integration test for final judgment in tests/integration/judgment.test.ts

### Implementation for User Story 3

- [X] T070 [P] [US3] 扩展 lib/agents/chains/judge-chain.ts 添加犯规检测逻辑 (已存在于之前的实现)
- [X] T071 [US3] 实现裁判评分的结构化输出验证 (zod schema)
- [X] T072 [US3] 实现 lib/services/scoring-service.ts 评分计算服务
- [X] T073 [US3] 实现最终裁决生成逻辑 (胜负判定、关键转折回合、决胜论点)
- [X] T074 [US3] 实现犯规记录和处罚逻辑
- [X] T075 [US3] 实现 app/api/debates/[id]/report/route.ts GET 获取复盘报告 API 端点

**Checkpoint**: ✅ 用户故事 3 完成 - 所有任务已完成

---

## Phase 6: User Story 4 - 观众投票与复盘 (Priority: P2)

**Goal**: 观众 Agent 投票，系统汇总裁判评分和观众投票计算胜负并生成复盘报告

**Independent Test**: 预设观众 Agent 投票结果和裁判评分，验证系统正确计算加权结果并生成复盘报告

### Tests for User Story 4

- [ ] T076 [P] [US4] Unit test for audience voting in tests/unit/chains/audience-chain.test.ts
- [ ] T077 [P] [US4] Integration test for vote aggregation in tests/integration/voting.test.ts

### Implementation for User Story 4

- [X] T078 [P] [US4] 扩展 lib/agents/chains/audience-chain.ts 添加投票逻辑
- [X] T079 [US4] 实现观众投票的结构化输出验证 (zod schema)
- [X] T080 [US4] 实现 lib/services/voting-service.ts 投票汇总服务 (依赖 T078, T079)
- [X] T081 [US4] 实现加权胜负计算逻辑 (裁判权重 + 观众权重)
- [X] T082 [US4] 实现观众视角分歧分析逻辑
- [X] T083 [US4] 实现双方盲点分析逻辑
- [X] T084 [US4] 扩展复盘报告 API 返回观众投票和分歧分析

**Checkpoint**: ✅ 用户故事 4 完成 - 核心功能已完成（测试待补充）

---

## Phase 7: User Story 5 - 辩论数据持久化与查询 (Priority: P2)

**Goal**: 所有辩论数据持久化存储到 SQLite，支持查询历史记录

**Independent Test**: 执行完整辩论后查询数据库，验证所有数据表包含预期记录且关联关系正确

### Tests for User Story 5

- [ ] T085 [P] [US5] Unit test for repositories in tests/unit/repositories/*.test.ts
- [ ] T086 [P] [US5] Integration test for data persistence in tests/integration/persistence.test.ts

### Implementation for User Story 5

- [ ] T087 [P] [US5] 实现 lib/repositories/round.repository.ts 添加轮次关联查询方法
- [ ] T088 [P] [US5] 实现 lib/repositories/message.repository.ts 添加发言按时间顺序查询方法
- [ ] T089 [P] [US5] 实现 lib/repositories/score.repository.ts 添加评分汇总查询方法
- [X] T090 [US5] 实现 app/api/debates/[id]/rounds/route.ts GET 获取轮次列表 API 端点
- [X] T091 [US5] 实现 app/api/debates/[id]/rounds/[sequence]/route.ts GET 获取单轮详情 API 端点
- [ ] T092 [US5] 实现数据完整性验证 (外键约束检查)
- [X] T093 [US5] 实现数据导出功能 (JSON 格式归档)

**Checkpoint**: ✅ 用户故事 5 核心功能已完成 - API 端点和数据导出（测试和部分仓库方法待补充）

---

## Phase 8: Web 界面 (全部用户故事的前端展示)

**Goal**: 实现完整的 Web 用户界面

**Independent Test**: 手动测试所有 UI 交互流程

### Web 组件实现

- [X] T094 [P] 实现 app/(web)/layout.tsx Web 应用布局
- [X] T095 [P] 实现 components/layout/header.tsx 导航头部组件
- [X] T096 [P] 实现 app/(web)/debate/[id]/page.tsx 辩论观看页面
- [X] T097 [P] 实现 components/debate/debate-viewer.tsx 实时辩论观看器组件（SSE 客户端）
- [X] T098 [P] 实现 components/debate/score-card.tsx 评分卡片组件
- [X] T099 [P] 实现 components/debate/replay-report.tsx 复盘报告展示组件
- [X] T100 [P] 实现 app/(web)/history/page.tsx 历史记录页面
- [X] T101 实现 SSE 自动重连和断线处理逻辑
- [X] T102 实现辩论进度可视化展示
- [X] T103 实现错误提示和加载状态展示

### E2E 测试

- [ ] T104 实现 tests/e2e/web.spec.ts Playwright E2E 测试
- [ ] T105 测试创建辩论流程 E2E
- [ ] T106 测试实时观看辩论流程 E2E
- [ ] T107 测试查询历史记录流程 E2E

**Checkpoint**: ✅ Web 界面核心功能已完成（E2E 测试待补充）

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 跨用户故事的改进和质量保证

- [X] T108 [P] 创建 README.md 项目说明文档
- [X] T109 [P] 创建 CONTRIBUTING.md 贡献指南文档
- [X] T110 代码清理和重构
- [ ] T111 性能优化 (数据库查询、LLM 调用并发)
- [ ] T112 [P] 补充单元测试覆盖关键路径
- [X] T113 安全加固 (API 密钥管理、SQL 注入防护)
- [ ] T114 运行 quickstart.md 验证开发环境设置

### Quality Gates (Constitution Compliance)

- [X] T115 验证所有代码通过 ESLint 检查，零错误
- [X] T116 验证 TypeScript 类型安全，无隐式 any 类型
- [X] T117 验证错误消息清晰且可操作
- [ ] T118 验证 API 响应格式一致性
- [ ] T119 验证性能要求 (单轮 < 3 分钟，SSE < 100ms，查询 < 1 秒)
- [X] T120 验证所有文档使用中文编写
- [X] T121 验证代码注释和 API 文档使用中文
- [ ] T122 运行静态分析和安全扫描

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖 - 可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成 - 阻塞所有用户故事
- **User Stories (Phase 3-7)**: 全部依赖 Foundational 完成
  - 用户故事可并行执行（如果有足够人力）
  - 或按优先级顺序执行（P1 → P2）
- **Web 界面 (Phase 8)**: 依赖所有用户故事后端 API 完成
- **Polish (Phase 9)**: 依赖所有期望的用户故事完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 完成后可开始 - 无其他故事依赖
- **User Story 2 (P1)**: Foundational 完成后可开始 - 可独立测试
- **User Story 3 (P1)**: Foundational 完成 + 依赖 US2 的辩论流程
- **User Story 4 (P2)**: Foundational 完成 + 依赖 US2 的辩论流程 + 依赖 US3 的评分
- **User Story 5 (P2)**: Foundational 完成 - 可与其他用户故事并行

### Within Each User Story

- 测试必须先编写并确保失败
- Prompt/Chain 实现前于服务集成
- 服务实现前于 API 端点
- 核心实现前于集成
- 用户故事完成后再进入下一个优先级

### Parallel Opportunities

- 所有 Setup 阶段标记 [P] 的任务可并行执行
- 所有 Foundational 阶段标记 [P] 的任务可并行执行
- Foundational 完成后，用户故事可并行开始（如果团队容量允许）
- 每个用户故事中标记 [P] 的测试可并行执行
- 每个用户故事中标记 [P] 的模型/Chain 可并行执行
- 不同用户故事可由不同团队成员并行工作

---

## Parallel Example: User Story 2

```bash
# 并行启动所有 Prompt 模板：
Task: "实现 lib/agents/prompts/debater-prompts.ts 辩手 Prompt 模板"
Task: "实现 lib/agents/prompts/judge-prompts.ts 裁判 Prompt 模板"
Task: "实现 lib/agents/prompts/audience-prompts.ts 观众 Prompt 模板"

# 并行启动所有 Chain 实现：
Task: "实现 lib/agents/chains/debater-chain.ts 辩手 Chain 实现"
Task: "实现 lib/agents/chains/judge-chain.ts 裁判 Chain 实现"
Task: "实现 lib/agents/chains/audience-chain.ts 观众 Chain 实现"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational (CRITICAL - 阻塞所有故事)
3. 完成 Phase 3: User Story 1
4. **STOP and VALIDATE**: 独立测试用户故事 1
5. 如果准备就绪，部署/演示 MVP

### Incremental Delivery

1. 完成 Setup + Foundational → 基础设施就绪
2. 添加 User Story 1 → 独立测试 → 部署/演示 (MVP!)
3. 添加 User Story 2 → 独立测试 → 部署/演示
4. 添加 User Story 3 → 独立测试 → 部署/演示
5. 添加 User Story 4 → 独立测试 → 部署/演示
6. 添加 User Story 5 → 独立测试 → 部署/演示
7. 添加 Web 界面 → 完整系统
8. 每个故事增加价值而不破坏之前的故事

### Parallel Team Strategy

多开发者协作：

1. 团队共同完成 Setup + Foundational
2. Foundational 完成后:
   - Developer A: User Story 1 (API + 创建界面)
   - Developer B: User Story 2 (Agent 层 + 流程服务)
   - Developer C: User Story 3 (评分裁决)
3. 故事独立完成并集成

---

## Task Summary

- **Total Tasks**: 122
- **Setup (Phase 1)**: 14 tasks
- **Foundational (Phase 2)**: 20 tasks
- **User Story 1 (Phase 3)**: 11 tasks
- **User Story 2 (Phase 4)**: 22 tasks
- **User Story 3 (Phase 5)**: 8 tasks
- **User Story 4 (Phase 6)**: 9 tasks
- **User Story 5 (Phase 7)**: 9 tasks
- **Web 界面 (Phase 8)**: 14 tasks
- **Polish (Phase 9)**: 15 tasks

### Parallel Opportunities Identified

- **Setup**: 10 个并行任务 (T003-T010)
- **Foundational**: 17 个并行任务 (T017-T033)
- **US1**: 2 个并行测试 + 1 个并行服务
- **US2**: 9 个并行 Chain/Tool 任务
- **US3**: 2 个并行测试 + 1 个并行工具扩展
- **US4**: 2 个并行测试
- **US5**: 3 个并行测试 + 3 个并行仓库方法
- **Web**: 5 个并行组件

### Suggested MVP Scope

**MVP = Phase 1 + Phase 2 + Phase 3 (User Story 1)**

- 完成项目初始化
- 完成核心基础设施
- 实现发起和配置辩论功能
- **Total MVP Tasks**: 45 tasks
- **Estimated MVP Parallelizable**: ~15 tasks

### Format Validation

✅ **All tasks follow checklist format**:
- Checkbox: `- [ ]` ✓
- Task ID: T001-T122 ✓
- [P] marker: Applied where appropriate ✓
- [Story] label: Applied for user story phases ✓
- File paths: Included in all implementation tasks ✓

---

## Notes

- [P] 任务 = 不同文件，无依赖关系
- [Story] 标签映射任务到特定用户故事以便追踪
- 每个用户故事应独立可完成和测试
- 实现前验证测试失败
- 每个任务或逻辑组后提交
- 在任何检查点停止以独立验证故事
- 避免：模糊任务、同文件冲突、破坏独立性的跨故事依赖
