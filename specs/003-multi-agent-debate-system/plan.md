# Implementation Plan: 多模型 Agent 辩论系统

**Branch**: `003-multi-agent-debate-system` | **Date**: 2025-12-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-multi-agent-debate-system/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

构建一个基于 Next.js + LangChain 的多模型 Agent 辩论系统 Web 应用，支持：
- 用户通过 Web 界面创建和配置辩论会话
- 使用 LangChain 框架构建多个 LLM Agent（辩手、裁判、观众）
- 10 轮结构化辩论流程，严格遵守规则
- 通过 Server-Sent Events (SSE) 实时流式输出辩论内容
- SQLite 数据持久化存储
- 完整的复盘报告生成

技术栈：Next.js (App Router) + TypeScript + LangChain + SQLite + Server-Sent Events

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x, Next.js 15 (App Router)
**Primary Dependencies**:
- Next.js 15 (React Server Components, App Router)
- LangChain.js (@langchain/core, @langchain/openai, @langchain/anthropic)
- LangChain Expression Language (LCEL) - 用于链式调用
- better-sqlite3 (SQLite 数据库)
- tailwindcss + shadcn/ui (UI 组件)

**Agent Framework**: LangChain.js - 使用 LangSmith 进行 Agent 追踪和调试
**Storage**: SQLite (better-sqlite3) - 单文件数据库，适合本地部署和开发
**Testing**: Vitest (单元测试), Playwright (E2E 测试)
**Target Platform**: Web 浏览器 (Chrome, Firefox, Safari, Edge), Node.js 服务器
**Project Type**: web (全栈 Next.js 应用)
**Performance Goals**:
- 单轮辩论响应时间 < 3 分钟
- SSE 延迟 < 100ms
- 并发支持至少 3 个独立辩论会话
- 数据库查询 < 1 秒

**Constraints**:
- 必须使用 LangChain 框架实现所有 Agent
- 必须使用 LLM API 的流式模式（streaming）
- 必须通过 SSE 实时推送内容到前端
- 系统作为持久化服务运行
- 所有文档必须使用中文编写

**Scale/Scope**:
- 支持 5+ 种不同的 LLM 提供商（OpenAI, Claude, Gemini, DeepSeek 等）
- 每个辩论会话 10 轮，预计 30 分钟完成
- 历史辩论记录本地存储
- 使用 LangSmith 进行 Agent 行为追踪和分析

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality**: ✅ 计划使用 TypeScript 严格模式，ESLint + Prettier 代码规范，Vitest 单元测试覆盖关键路径
- **User Experience Consistency**: ✅ SSE 实时推送确保 200ms 内反馈，统一错误处理，shadcn/ui 提供一致的界面体验
- **Performance Requirements**: ✅ 明确定义了响应时间目标（单轮 < 3 分钟，SSE < 100ms），使用 SQLite 索引优化查询
- **Documentation Language**: ✅ 所有文档（spec.md, plan.md, 代码注释）均使用中文编写

**Result**: ✅ All gates passed - no violations to justify

## Project Structure

### Documentation (this feature)

```text
specs/003-multi-agent-debate-system/
├── plan.md              # 本文件 (/speckit.plan 命令输出)
├── research.md          # Phase 0 输出
├── data-model.md        # Phase 1 输出
├── quickstart.md        # Phase 1 输出
├── contracts/           # Phase 1 输出
│   └── api-schema.yaml  # API 接口定义
└── tasks.md             # Phase 2 输出 (/speckit.tasks 命令 - 非 /speckit.plan 创建)
```

### Source Code (repository root)

```text
# Next.js App Router 结构
app/
├── (web)/                        # Web 界面路由组
│   ├── create-debate/            # 创建辩论页面
│   ├── debate/[id]/              # 辩论详情/观看页面
│   │   └── route.ts              # SSE 端点
│   ├── history/                  # 历史记录页面
│   └── layout.tsx                # Web 布局
├── api/                          # API 路由
│   ├── debates/                  # 辩论 CRUD
│   │   ├── route.ts              # POST /api/debates (创建)
│   │   └── [id]/                 # GET/PUT/DELETE /api/debates/[id]
│   └── models/                   # 模型配置管理
├── db/
│   └── route.ts                  # 数据库初始化端点
└── layout.tsx                    # 根布局

lib/
├── db/
│   ├── schema.ts                 # SQLite schema 定义
│   ├── client.ts                 # SQLite 客户端单例
│   └── migrations/               # 数据库迁移
├── agents/                       # LangChain Agent 定义
│   ├── chains/                   # LangChain Chains
│   │   ├── debater-chain.ts      # 辩手 Chain
│   │   ├── judge-chain.ts        # 裁判 Chain
│   │   └── audience-chain.ts     # 观众 Chain
│   ├── prompts/                  # Prompt 模板
│   │   ├── debater-prompts.ts    # 辩手 Prompt
│   │   ├── judge-prompts.ts      # 裁判 Prompt
│   │   └── system-prompts.ts    # 系统 Prompt
│   └── tools/                    # LangChain Tools
│       ├── score-tool.ts         # 评分工具
│       └── request-tool.ts       # 观众申请工具
├── services/
│   ├── debate-service.ts         # 辩论流程编排服务
│   ├── langchain-service.ts      # LangChain 集成服务
│   ├── sse-service.ts            # SSE 推送服务
│   └── memory-service.ts         # Agent 记忆管理
├── repositories/                 # 数据访问层
│   ├── debate.repository.ts
│   ├── message.repository.ts
│   ├── score.repository.ts
│   └── vote.repository.ts
├── models/                       # 数据模型
│   ├── debate.ts
│   ├── agent.ts
│   ├── round.ts
│   ├── message.ts
│   └── score.ts
├── langchain/                    # LangChain 配置
│   ├── config.ts                 # 模型配置
│   └── callbacks.ts              # LangSmith 追踪回调
└── utils/
    ├── logger.ts
    └── config.ts                 # 环境变量配置

components/
├── ui/                           # shadcn/ui 组件
├── debate/
│   ├── debate-config-form.tsx    # 辩论配置表单
│   ├── debate-viewer.tsx         # 实时辩论观看器
│   ├── score-card.tsx            # 评分卡片
│   └── replay-report.tsx         # 复盘报告组件
└── layout/
    └── header.tsx

data/
└── debates.db                    # SQLite 数据库文件

tests/
├── unit/
│   ├── agents/                   # Agent 单元测试
│   ├── chains/                   # Chain 单元测试
│   └── services/                 # 服务单元测试
├── integration/
│   └── debate-flow.test.ts       # 辩论流程集成测试
└── e2e/
    └── web.spec.ts               # Playwright E2E 测试
```

**Structure Decision**: 采用 Next.js App Router 单一应用结构，前后端集成在同一项目中。这是 Next.js 的标准做法，简化了部署和数据流管理。所有业务逻辑在 `/lib` 目录，组件在 `/components` 目录，API 路由在 `/app/api` 目录。

**LangChain 集成**: 使用 LangChain.js 的模块化架构，将每个 Agent 类型实现为独立的 Chain，通过 LCEL (LangChain Expression Language) 组合。使用 LangSmith 进行 Agent 行为追踪和调试。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| LangChain 框架 | 用户明确要求使用 LangChain 实现 Agent | 虽然 Vercel AI SDK 更简洁，但用户需要 LangChain 的功能（Tools、Memory、多 Agent 协作） |

## LangChain Agent 架构说明

### 决策：使用 LangChain.js 实现所有 Agent

**原因**（用户要求）:
- **框架完整性**: LangChain 提供了完整的 Agent 抽象，包括 Tools、Memory、Chains
- **多模型支持**: 统一接口支持多个 LLM 提供商
- **可观测性**: LangSmith 提供了 Agent 行为追踪和调试能力
- **社区生态**: 丰富的预设 Chains 和 Tools 可复用

### LangChain 核心概念

#### 1. Chains（链）

每个 Agent 类型对应一个 Chain：

```typescript
// lib/agents/chains/debater-chain.ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";

export function createDebaterChain(llm: BaseChatModel) {
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", debaterSystemPrompt],
    ["human", "{debate_topic}\n\n{context}\n\n请根据你的立场（{stance}）进行辩论。"]
  ]);

  const outputParser = new StringOutputParser();

  return RunnableSequence.from([
    {
      debate_topic: new RunnablePassthrough(),
      context: formatContext,
      stance: new RunnablePassthrough(),
    },
    promptTemplate,
    llm,
    outputParser,
  ]);
}
```

#### 2. Tools（工具）

裁判 Agent 使用 Tools 进行结构化输出：

```typescript
// lib/agents/tools/score-tool.ts
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const scoreTool = new DynamicStructuredTool({
  name: "score_debate_round",
  description: "对一轮辩论进行评分",
  schema: z.object({
    pro_logic: z.number().min(0).max(10),
    pro_rebuttal: z.number().min(0).max(10),
    pro_clarity: z.number().min(0).max(10),
    pro_evidence: z.number().min(0).max(10),
    con_logic: z.number().min(0).max(10),
    con_rebuttal: z.number().min(0).max(10),
    con_clarity: z.number().min(0).max(10),
    con_evidence: z.number().min(0).max(10),
    comment: z.string(),
    foul_detected: z.boolean(),
  }),
  func: async (input) => {
    // 保存评分到数据库
    await saveScores(input);
    return JSON.stringify(input);
  },
});
```

#### 3. Memory（记忆）

Agent 使用 Memory 跟踪历史上下文：

```typescript
// lib/services/memory-service.ts
import { BufferWindowMemory } from "langchain/memory";

export class DebateMemory {
  private memory = new BufferWindowMemory({
    k: 5, // 保留最近 5 轮对话
    returnMessages: true,
  });

  async getContext(round: number): Promise<string> {
    const messages = await this.memory.loadMemoryVariables({});
    return this.formatMessages(messages);
  }

  async addMessage(role: string, content: string) {
    await this.memory.saveContext(
      { input: content },
      { output: "" }
    );
  }
}
```

#### 4. 流式输出

使用 LangChain 的流式 API：

```typescript
// lib/services/langchain-service.ts
import { RunnableConfig } from "@langchain/core/runnables";

export class LangChainService {
  async *streamDebaterResponse(
    chain: RunnableSequence,
    inputs: Record<string, unknown>
  ): AsyncGenerator<string> {
    const stream = await chain.stream(inputs, {
      callbacks: [new SSECallback()], // 自定义回调推送 SSE
    });

    for await (const chunk of stream) {
      yield chunk;
    }
  }
}
```

### LangSmith 追踪

配置 LangSmith 进行 Agent 行为追踪：

```typescript
// lib/langchain/config.ts
import { LangChainTracer } from "langchain/callbacks";

export const callbacks = process.env.LANGCHAIN_API_KEY
  ? [new LangChainTracer({ projectName: "debate-agents" })]
  : [];

// 每次调用时传入
await chain.invoke(inputs, { callbacks });
```

## Phase 0: Research & Technology Decisions

详见 [research.md](./research.md)

## Phase 1: Design Artifacts

### Data Model

详见 [data-model.md](./data-model.md)

### API Contracts

详见 [contracts/api-schema.yaml](./contracts/api-schema.yaml)

### Quick Start Guide

详见 [quickstart.md](./quickstart.md)

## Implementation Phases

### Phase 0: 项目初始化 (已完成)

1. ✅ 创建 Next.js 项目
2. ✅ 安装依赖 (TypeScript, ESLint, Tailwind, shadcn/ui)
3. ✅ 安装 LangChain 依赖
4. ✅ 配置 SQLite (better-sqlite3)
5. ✅ 配置环境变量

### Phase 1: 核心数据层

**任务**:
1. 实现 SQLite schema 和迁移
2. 创建数据模型 (models/)
3. 实现数据访问层 (repositories/)
4. 编写单元测试

**交付**:
- `lib/db/schema.ts` - 完整数据库表定义
- `lib/models/*.ts` - TypeScript 数据模型
- `lib/repositories/*.ts` - CRUD 操作
- `tests/unit/repositories/*.test.ts` - 测试覆盖

### Phase 2: LangChain Agent 层

**任务**:
1. 实现 Prompt 模板 (agents/prompts/)
2. 实现 Chains (agents/chains/)
3. 实现 Tools (agents/tools/)
4. 实现 Memory 服务
5. 配置 LangSmith 追踪
6. 编写 Agent 单元测试

**交付**:
- `lib/agents/prompts/*.ts` - Prompt 模板
- `lib/agents/chains/*.ts` - Chain 实现
- `lib/agents/tools/*.ts` - Tool 实现
- `lib/services/memory-service.ts` - 记忆管理
- `lib/langchain/config.ts` - LangChain 配置
- `tests/unit/agents/*.test.ts` - 测试

### Phase 3: 辩论流程服务

**任务**:
1. 实现辩论流程编排服务
2. 实现 SSE 推送服务
3. 集成 LangChain Chains
4. 编写集成测试

**交付**:
- `lib/services/debate-service.ts` - 10 轮流程控制
- `lib/services/langchain-service.ts` - LangChain 集成
- `lib/services/sse-service.ts` - SSE 推送
- `lib/langchain/callbacks.ts` - SSE 自定义回调
- `tests/integration/debate-flow.test.ts` - 流程测试

### Phase 4: API 路由

**任务**:
1. 实现辩论 CRUD API
2. 实现辩论启动和控制 API
3. 实现 SSE 实时推送端点
4. 实现历史查询 API

**交付**:
- `app/api/debates/route.ts` - POST/GET
- `app/api/debates/[id]/*` - 操作端点
- `app/debate/[id]/route.ts` - SSE 端点
- API 契约测试

### Phase 5: Web 界面

**任务**:
1. 实现辩论配置页面
2. 实现实时辩论观看器（SSE 客户端）
3. 实现复盘报告展示
4. 实现历史记录页面

**交付**:
- `app/(web)/create-debate/page.tsx` - 创建表单
- `app/(web)/debate/[id]/page.tsx` - 观看页面
- `components/debate/*.tsx` - UI 组件
- `tests/e2e/web.spec.ts` - E2E 测试

### Phase 6: 测试与优化

**任务**:
1. 完善测试覆盖率
2. 性能优化
3. 错误处理完善
4. LangSmith 追踪分析
5. 文档完善

**交付**:
- 测试覆盖率报告
- 性能基准测试结果
- LangSmith 追踪链接
- 完整的 README 和用户指南

## Dependencies

### 外部服务依赖
- OpenAI API (GPT-4.x)
- Anthropic API (Claude)
- Google API (Gemini)
- DeepSeek API
- LangSmith (Agent 追踪，可选)

### 内部技术依赖
- Next.js 15+ (App Router, Server Components)
- React 19+
- LangChain.js:
  - @langchain/core
  - @langchain/openai
  - @langchain/anthropic
  - @langchain/google
  - langchain (主包)
- better-sqlite3 (SQLite)
- tailwindcss + shadcn/ui
- Vitest + Playwright

## Risk Mitigation

| 风险 | 缓解措施 |
|------|----------|
| LangChain 学习曲线 | 使用官方模板和示例，逐步实现 |
| LangChain 性能开销 | 监控响应时间，必要时直接使用 SDK |
| LLM API 不稳定 | 实现重试机制、超时控制、降级策略 |
| SSE 连接断开 | 自动重连、断点续传 |
| 并发会话冲突 | 会话隔离、资源池管理 |
| Agent 行为不可预测 | 使用 LangSmith 追踪和分析 |

## Success Criteria

- ✅ 用户可以在 5 分钟内配置并启动一个辩论
- ✅ 10 轮辩论在 30 分钟内自动完成
- ✅ 用户可以实时观看辩论过程（SSE 延迟 < 100ms）
- ✅ 所有辩论数据正确持久化到 SQLite
- ✅ 生成的复盘报告包含所有必需信息
- ✅ 使用 LangChain 实现所有 Agent
- ✅ 测试覆盖率 > 80%
- ✅ 所有文档使用中文编写
- ✅ LangSmith 追踪正常工作（可选）
