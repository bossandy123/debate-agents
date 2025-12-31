# Research & Technology Decisions

**Feature**: 多模型 Agent 辩论系统
**Date**: 2025-12-31
**Status**: Phase 0 Complete

## 概述

本文档记录了多模型 Agent 辩论系统的技术选型决策过程和研究成果。所有决策都基于功能需求、性能要求和项目约束进行分析。

---

## 1. 前端框架选择

### 决策：Next.js 15 (App Router)

**原因**:
- **全栈一体**: Next.js 提供前后端一体化的开发体验，API Routes 可以直接在同一项目中实现
- **Server Components**: RSC 减少客户端 JavaScript 体积，提升首屏加载性能
- **SSE 原生支持**: Next.js 的流式响应特性与 Server-Sent Events 完美契合
- **TypeScript 优先**: 官方推荐使用 TypeScript，类型安全保障
- **生态成熟**: shadcn/ui 等组件库生态完善，快速构建高质量 UI

**其他选项评估**:

| 选项 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| Vite + React | 更快的开发启动速度 | 需要单独配置后端 API | ❌ 额外复杂度 |
| Remix | 优秀的流式渲染支持 | 学习曲线陡峭，社区较小 | ❌ 生态较小 |
| SvelteKit | 更小的运行时体积 | 类型支持较弱，生态较小 | ❌ 企业采用度低 |

**版本选择**: Next.js 15 (最新稳定版)

---

## 2. Agent 框架选择 ⭐

### 决策：LangChain.js

**原因**（用户明确要求）:
- **完整的 Agent 抽象**: 提供 Chains、Tools、Memory、Agents 等完整抽象
- **LCEL (LangChain Expression Language)**: 声明式构建复杂 Agent 流程
- **多模型支持**: 统一接口支持 OpenAI、Anthropic、Google、DeepSeek
- **流式支持**: 原生支持流式输出，与 SSE 完美集成
- **可观测性**: LangSmith 提供 Agent 行为追踪和调试能力
- **社区生态**: 丰富的预设 Chains、Tools、Prompt 模板可复用

### LangChain 核心概念

#### Chains（链）

每个 Agent 类型对应一个 Chain，使用 LCEL 组合：

```typescript
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";

export function createDebaterChain(llm: BaseChatModel) {
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", debaterSystemPrompt],
    ["human", "辩题: {topic}\n立场: {stance}\n历史对话:\n{history}\n\n请进行辩论。"]
  ]);

  return RunnableSequence.from([
    {
      topic: new RunnablePassthrough(),
      stance: new RunnablePassthrough(),
      history: loadHistory,
    },
    promptTemplate,
    llm,
    new StringOutputParser(),
  ]);
}
```

#### Tools（工具）

Agent 可以调用工具执行特定操作：

```typescript
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// 观众申请下场工具
export const audienceRequestTool = new DynamicStructuredTool({
  name: "request_to_speak",
  description: "观众申请下场发言",
  schema: z.object({
    intent: z.enum(["support_pro", "support_con"]),
    claim: z.string(),
    novelty: z.enum(["new", "reinforcement"]),
    confidence: z.number().min(0).max(1),
  }),
  func: async (input) => {
    // 保存申请到数据库
    await saveAudienceRequest(input);
    return "申请已提交，等待裁判批准";
  },
});
```

#### Memory（记忆）

使用 BufferWindowMemory 跟踪历史上下文：

```typescript
import { BufferWindowMemory } from "langchain/memory";

export class DebateMemory {
  private memory = new BufferWindowMemory({
    k: 5, // 保留最近 5 轮对话
    returnMessages: true,
    inputKey: "input",
    outputKey: "output",
  });

  async getContext(): Promise<string> {
    const { history } = await this.memory.loadMemoryVariables({});
    return history
      .map((msg: HumanMessage | AIMessage) => `${msg.constructor.name}: ${msg.content}`)
      .join("\n");
  }

  async addMessage(input: string, output: string) {
    await this.memory.saveContext({ input }, { output });
  }
}
```

#### 流式输出

使用 LangChain 的 `.stream()` 方法：

```typescript
export class LangChainService {
  async *streamResponse(
    chain: RunnableSequence,
    inputs: Record<string, unknown>
  ): AsyncGenerator<string> {
    const stream = await chain.stream(inputs);

    for await (const chunk of stream) {
      yield chunk; // 每个 Token
    }
  }
}
```

#### LangSmith 追踪

配置环境变量启用 LangSmith 追踪：

```bash
# .env.local
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_api_key
LANGCHAIN_PROJECT=debate-agents
```

每次 Chain 调用会自动追踪到 LangSmith Dashboard。

### 其他选项评估

| 选项 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| **Vercel AI SDK** | 轻量、快速、官方支持 | 功能较基础，缺少 Agent 抽象 | ⚠️ 之前的选择，被用户替换 |
| **LangChain.js** | 完整框架、生态丰富 | 学习曲线陡峭 | ✅ **用户选择** |
| **AutoGPT** | 自主 Agent | 过于复杂，不适合此场景 | ❌ 过度设计 |

---

## 3. 数据库选择

### 决策：SQLite (better-sqlite3)

**原因**:
- **零配置**: 单文件数据库，无需独立数据库服务器
- **高性能**: 对于单应用场景，SQLite 性能优于网络数据库
- **事务支持**: 完整的 ACID 事务支持
- **Node.js 生态**: better-sqlite3 是最快的 SQLite Node.js 绑定
- **适合场景**: 辩论系统主要是单用户或小团队使用，并发量低

**其他选项评估**:

| 选项 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| PostgreSQL | 强大的查询能力 | 需要独立部署，运维成本高 | ❌ 过度设计 |
| MongoDB | 灵活的文档模型 | 不需要复杂的数据结构 | ❌ 关系模型更合适 |

---

## 4. LLM 提供商集成

### 决策：多提供商支持

使用 LangChain 的统一接口集成多个 LLM 提供商：

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export function createLLM(provider: string, model: string) {
  switch (provider) {
    case "openai":
      return new ChatOpenAI({
        modelName: model,
        temperature: 0.7,
        streaming: true,
      });
    case "anthropic":
      return new ChatAnthropic({
        modelName: model,
        temperature: 0.7,
        streaming: true,
      });
    case "google":
      return new ChatGoogleGenerativeAI({
        modelName: model,
        temperature: 0.7,
        streaming: true,
      });
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
```

### 流式模式

所有 LLM 调用都使用流式模式：

```typescript
const llm = createLLM("openai", "gpt-4");
const stream = await llm.stream(messages);

for await (const chunk of stream) {
  // 推送到 SSE
  sseService.send(chunk);
}
```

---

## 5. 实时推送技术

### 决策：Server-Sent Events (SSE)

**原因**:
- **单向推送**: 辩论内容是服务器到客户端的单向数据流
- **自动重连**: 浏览器原生支持断线重连
- **简单实现**: Next.js 原生支持流式响应
- **与 LangChain 集成**: LangChain 的流式输出可以直接转换为 SSE

**实现方案**:

```typescript
// app/api/debates/[id]/stream/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const encoder = new TextEncoder();
  const debateId = parseInt(params.id);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // 订阅辩论进度
      const unsubscribe = debateService.subscribe(debateId, async (event) => {
        if (event.type === "agent_speaking") {
          // 使用 LangChain 流式输出
          const langchainService = new LangChainService();
          for await (const token of langchainService.streamResponse(
            event.chain,
            event.inputs
          )) {
            send({ type: "token", data: { token } });
          }
        }
      });

      request.signal.addEventListener('abort', () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## 6. UI 组件库选择

### 决策：shadcn/ui + Tailwind CSS

**原因**:
- **非打包方式**: 直接复制组件代码到项目，完全可控
- **Radix UI 基础**: 无障碍访问和键盘导航支持完善
- **Tailwind CSS**: 实用优先的 CSS 框架，快速构建定制化 UI
- **TypeScript 原生**: 完整的类型定义
- **与 Next.js 完美集成**: 支持 Server Components

---

## 7. 测试框架选择

### 决策：Vitest + Playwright

**Vitest (单元测试)**:
- 极快的测试启动速度
- Jest 兼容 API
- TypeScript 原生支持
- Mock 功能强大

**Playwright (E2E 测试)**:
- 多浏览器支持
- 自动等待
- 网络拦截

**LangChain 测试**:

```typescript
import { createDebaterChain } from "@/lib/agents/chains/debater-chain";
import { mockChatModel } from "@langchain/core/utils/testing";

describe("DebaterChain", () => {
  it("should generate debate response", async () => {
    const mockLLM = mockChatModel({
      responses: ["我方认为..."],
    });

    const chain = createDebaterChain(mockLLM);
    const result = await chain.invoke({
      topic: "AI是否会取代人类",
      stance: "pro",
      history: "",
    });

    expect(result).toContain("我方认为");
  });
});
```

---

## 8. 状态管理策略

### 决策：React Server Components + Server Actions

- Next.js 15 推荐模式
- 状态管理在服务器端
- SSE 客户端状态使用 `useState` + `useEffect`

---

## 9. LangSmith 可观测性

### 决策：启用 LangSmith 追踪（可选）

**配置**:

```typescript
// lib/langchain/config.ts
export const langchainConfig = {
  tracing: process.env.LANGCHAIN_TRACING_V2 === "true",
  projectName: "debate-agents",
  callbacks: process.env.LANGCHAIN_API_KEY
    ? [new LangChainTracer()]
    : [],
};
```

**收益**:
- 可视化 Chain 执行流程
- 调试 Prompt 和 LLM 输出
- 性能分析
- 成本追踪

---

## 10. 辩论流程并发控制

### 决策：单进程队列 + 会话隔离

```typescript
class DebateOrchestrator {
  private activeDebates = new Map<number, DebateSession>();
  private semaphore = new Semaphore(3); // 最多 3 个并发

  async startDebate(debateId: number) {
    await this.semaphore.acquire();

    try {
      const session = new DebateSession(debateId);
      this.activeDebates.set(debateId, session);
      await this.runDebate(session);
    } finally {
      this.semaphore.release();
    }
  }
}
```

---

## 11. 数据持久化策略

### 决策：实时写入 + 定期压缩

- 发言内容立即写入 `messages` 表
- 评分立即写入 `scores` 表
- 使用索引优化查询性能

---

## 12. 错误处理策略

### LangChain 特定

```typescript
export class LangChainService {
  async *streamResponseWithRetry(
    chain: RunnableSequence,
    inputs: Record<string, unknown>,
    maxRetries = 3
  ): AsyncGenerator<string> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const stream = await chain.stream(inputs);
        for await (const chunk of stream) {
          yield chunk;
        }
        return; // 成功则退出
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await sleep(Math.pow(2, i) * 1000);
      }
    }
  }
}
```

---

## 13. 部署策略

### Docker 容器化

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 14. 性能优化策略

### LangChain 特定优化

- **使用 `.bind()` 缓存 Chain**: 避免重复初始化
- **Prompt 压缩**: 移除冗余上下文
- **批量处理**: 多个观众投票可以并行调用

```typescript
// 并行调用多个观众 Agent
const audienceChains = audienceAgents.map(agent =>
  createAudienceChain(agent)
);

const results = await Promise.allSettled(
  audienceChains.map(chain => chain.invoke(inputs))
);
```

---

## 15. 安全考虑

- API 密钥通过环境变量管理
- LangChain Tool 输入验证
- SQL 注入防护（参数化查询）

---

## 总结

所有技术选型都遵循以下原则：
1. **用户优先**: 用户明确要求使用 LangChain
2. **简单优先**: 在 LangChain 框架内，选择最简单的实现方式
3. **性能考虑**: 流式输出、并发控制、缓存策略
4. **可维护性**: TypeScript 严格模式、LangSmith 追踪、测试覆盖

**核心依赖清单**:
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "langchain": "^0.3.0",
    "@langchain/core": "^0.3.0",
    "@langchain/openai": "^0.3.0",
    "@langchain/anthropic": "^0.3.0",
    "@langchain/google-genai": "^0.3.0",
    "better-sqlite3": "^11.0.0",
    "tailwindcss": "^3.4.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^2.0.0",
    "playwright": "^1.40.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0"
  }
}
```

### LangChain 学习资源

- 官方文档: https://js.langchain.com/
- LangSmith: https://smith.langchain.com/
- 示例项目: https://github.com/langchain-ai/langchainjs/tree/main/examples
