# 快速开始指南

**项目**: 多模型 Agent 辩论系统
**最后更新**: 2025-12-31

---

## 前置要求

在开始之前，请确保您的系统已安装：

- **Node.js** 20.x 或更高版本
- **npm** 或 **pnpm** 包管理器
- **Git** 版本控制

---

## 1. 项目初始化

### 1.1 创建 Next.js 项目

```bash
# 使用 create-next-app 创建项目
npx create-next-app@latest debate-agents --typescript --tailwind --eslint

cd debate-agents
```

### 1.2 安装 LangChain 依赖

```bash
# LangChain 核心
npm install langchain @langchain/core @langchain/openai @langchain/anthropic @langchain/google-genai

# 数据库
npm install better-sqlite3

# UI 组件
npx shadcn-ui@latest init

# 表单处理
npm install react-hook-form @hookform/resolvers zod

# 其他工具
npm install date-fns clsx tailwind-merge
```

### 1.3 安装开发依赖

```bash
# 测试
npm install -D vitest @vitest/ui
npm install -D playwright @playwright/test

# 代码质量
npm install -D @types/better-sqlite3
npm install -D prettier prettier-plugin-tailwindcss
```

---

## 2. 环境配置

### 2.1 创建环境变量文件

创建 `.env.local` 文件：

```bash
# .env.local

# LLM API Keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# LangSmith (可选，用于 Agent 追踪)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_api_key_here
LANGCHAIN_PROJECT=debate-agents

# 数据库
DATABASE_PATH=./data/debates.db

# 应用配置
NODE_ENV=development
PORT=3000
```

---

## 3. 项目结构搭建

```bash
# 创建核心目录
mkdir -p lib/agents/{chains,prompts,tools}
mkdir -p lib/db/{migrations}
mkdir -p lib/{services,repositories,models,utils,langchain}
mkdir -p components/{debate,ui}
mkdir -p app/\(web\)/{create-debate,debates/\[id\],history}
mkdir -p app/api/debates
mkdir -p tests/{unit/{agents,chains,services},integration,e2e}
mkdir -p data
```

---

## 4. LangChain 配置

### 4.1 创建 LLM 配置

创建 `lib/langchain/config.ts`：

```typescript
// lib/langchain/config.ts
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export interface LLMConfig {
  provider: "openai" | "anthropic" | "google" | "deepseek";
  model: string;
  temperature?: number;
  streaming?: boolean;
}

export function createLLM(config: LLMConfig) {
  const { provider, model, temperature = 0.7, streaming = true } = config;

  switch (provider) {
    case "openai":
      return new ChatOpenAI({
        modelName: model,
        temperature,
        streaming,
        apiKey: process.env.OPENAI_API_KEY,
      });

    case "anthropic":
      return new ChatAnthropic({
        modelName: model,
        temperature,
        streaming,
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

    case "google":
      return new ChatGoogleGenerativeAI({
        modelName: model,
        temperature,
        streaming,
        apiKey: process.env.GOOGLE_API_KEY,
      });

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// LangSmith 追踪配置
export const langchainCallbacks = process.env.LANGCHAIN_API_KEY
  ? [
      // 在生产环境启用 LangSmith 追踪
      // import { LangChainTracer } from "langchain/callbacks";
      // new LangChainTracer({ projectName: "debate-agents" }),
    ]
  : [];
```

### 4.2 创建 Prompt 模板

创建 `lib/agents/prompts/debater-prompts.ts`：

```typescript
// lib/agents/prompts/debater-prompts.ts
import { ChatPromptTemplate } from "@langchain/core/prompts";

// 辩手系统 Prompt
export const debaterSystemPrompt = `你是一名专业的辩手。请遵循以下规则：

1. 立场明确：始终保持你的立场（正方/反方）
2. 引用反驳：必须引用对方论点才能进行反驳
3. 逻辑清晰：使用结构化的论证
4. 尊重对手：使用礼貌、专业的语言

{phase_instructions}`;

// 不同阶段的指令
export const phaseInstructions = {
  opening: "这是开篇立论阶段，请提出你的核心论点（不超过3个）。",
  rebuttal: "这是反驳阶段，请针对对方的论点进行反驳，不要引入新的主论点。",
  closing: "这是总结陈词阶段，请总结已有论点，不要引入新的事实。",
};

// 辩手 Prompt 模板
export const debaterPromptTemplate = ChatPromptTemplate.fromMessages([
  ["system", debaterSystemPrompt],
  [
    "human",
    `辩题: {topic}
立场: {stance}
{phase_instruction}

历史对话:
{history}

请根据你的立场进行辩论。`,
  ],
]);
```

创建 `lib/agents/prompts/judge-prompts.ts`：

```typescript
// lib/agents/prompts/judge-prompts.ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

// 裁判评分 Schema
export const scoreSchema = z.object({
  pro: z.object({
    logic: z.number().min(0).max(10).describe("逻辑一致性"),
    rebuttal: z.number().min(0).max(10).describe("针对性反驳"),
    clarity: z.number().min(0).max(10).describe("表达清晰度"),
    evidence: z.number().min(0).max(10).describe("论证有效性"),
  }),
  con: z.object({
    logic: z.number().min(0).max(10).describe("逻辑一致性"),
    rebuttal: z.number().min(0).max(10).describe("针对性反驳"),
    clarity: z.number().min(0).max(10).describe("表达清晰度"),
    evidence: z.number().min(0).max(10).describe("论证有效性"),
  }),
  foul_detected: z.boolean().describe("是否检测到犯规"),
  foul_description: z.string().optional().describe("犯规描述"),
  comment: z.string().describe("本轮评论"),
});

// 裁判 Prompt 模板
export const judgePromptTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    `你是一名公正的辩论裁判。请从以下维度对双方进行评分：
- 逻辑一致性（0-10分）
- 针对性反驳（0-10分）
- 表达清晰度（0-10分）
- 论证有效性（0-10分）

同时注意检测犯规行为。`,
  ],
  [
    "human",
    `辩题: {topic}
轮次: {round}

正方发言:
{pro_speech}

反方发言:
{con_speech}

请对双方进行评分，并输出 JSON 格式结果。`,
  ],
]);

// 创建结构化输出 Parser
export const scoreParser = new StructuredOutputParser(scoreSchema);
```

### 4.3 创建 Chains

创建 `lib/agents/chains/debater-chain.ts`：

```typescript
// lib/agents/chains/debater-chain.ts
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { debaterPromptTemplate, phaseInstructions } from "../prompts/debater-prompts";
import { createLLM } from "@/lib/langchain/config";

export function createDebaterChain(config: {
  provider: string;
  model: string;
  stance: "pro" | "con";
}) {
  const llm = createLLM({
    provider: config.provider,
    model: config.model,
  });

  const chain = RunnableSequence.from([
    {
      topic: new RunnablePassthrough(),
      stance: new RunnablePassthrough(),
      phase_instruction: (input: { phase: string }) =>
        phaseInstructions[input.phase as keyof typeof phaseInstructions] ||
        phaseInstructions.rebuttal,
      history: new RunnablePassthrough(),
    },
    debaterPromptTemplate,
    llm,
    new StringOutputParser(),
  ]);

  return chain;
}
```

创建 `lib/agents/chains/judge-chain.ts`：

```typescript
// lib/agents/chains/judge-chain.ts
import { RunnableSequence } from "@langchain/core/runnables";
import { judgePromptTemplate, scoreParser } from "../prompts/judge-prompts";
import { createLLM } from "@/lib/langchain/config";

export function createJudgeChain(config: {
  provider: string;
  model: string;
}) {
  const llm = createLLM({
    provider: config.provider,
    model: config.model,
  });

  const chain = RunnableSequence.from([
    {
      topic: new RunnablePassthrough(),
      round: new RunnablePassthrough(),
      pro_speech: new RunnablePassthrough(),
      con_speech: new RunnablePassthrough(),
    },
    judgePromptTemplate,
    llm,
    scoreParser,
  ]);

  return chain;
}
```

---

## 5. 核心服务实现

### 5.1 LangChain 服务

创建 `lib/services/langchain-service.ts`：

```typescript
// lib/services/langchain-service.ts
import { RunnableSequence } from "@langchain/core/runnables";
import { createLLM, langchainCallbacks } from "@/lib/langchain/config";

export class LangChainService {
  /**
   * 流式执行 Chain
   */
  async *streamChain(
    chain: RunnableSequence,
    inputs: Record<string, unknown>
  ): AsyncGenerator<string> {
    const stream = await chain.stream(inputs, {
      callbacks: langchainCallbacks,
    });

    for await (const chunk of stream) {
      yield chunk;
    }
  }

  /**
   * 执行 Chain 并返回完整结果
   */
  async invokeChain(
    chain: RunnableSequence,
    inputs: Record<string, unknown>
  ): Promise<unknown> {
    return await chain.invoke(inputs, {
      callbacks: langchainCallbacks,
    });
  }

  /**
   * 批量执行多个 Chains（用于观众投票）
   */
  async async invokeBatch(
    chains: RunnableSequence[],
    inputsList: Record<string, unknown>[]
  ): Promise<unknown[]> {
    const results = await Promise.allSettled(
      chains.map((chain, i) =>
        this.invokeChain(chain, inputsList[i])
      )
    );

    return results.map((result, i) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        console.error(`Chain ${i} failed:`, result.reason);
        return null;
      }
    });
  }
}
```

### 5.2 辩论服务

创建 `lib/services/debate-service.ts`：

```typescript
// lib/services/debate-service.ts
import { getDb } from "@/lib/db/client";
import { LangChainService } from "./langchain-service";
import { createDebaterChain } from "@/lib/agents/chains/debater-chain";
import { createJudgeChain } from "@/lib/agents/chains/judge-chain";
import { SSEService } from "./sse-service";

export class DebateService {
  private langchain = new LangChainService();
  private sse = new SSEService();
  private activeDebates = new Map<number, DebateSession>();

  async startDebate(debateId: number) {
    const db = getDb();

    // 获取辩论配置
    const debate = db.prepare('SELECT * FROM debates WHERE id = ?').get(debateId) as any;
    const agents = db.prepare('SELECT * FROM agents WHERE debate_id = ?').all(debateId) as any[];

    // 更新状态
    db.prepare('UPDATE debates SET status = ?, started_at = ? WHERE id = ?')
      .run('running', new Date().toISOString(), debateId);

    // 在后台运行辩论
    this.runDebate(debateId, debate, agents).catch((error) => {
      console.error(`Debate ${debateId} failed:`, error);
      this.markAsFailed(debateId, error.message);
    });
  }

  private async runDebate(debateId: number, debate: any, agents: any[]) {
    for (let round = 1; round <= debate.max_rounds; round++) {
      await this.runRound(debateId, round, agents);
    }

    // 计算最终结果
    await this.calculateFinalResult(debateId, agents);
  }

  private async runRound(debateId: number, sequence: number, agents: any[]) {
    const db = getDb();

    // 创建轮次记录
    const phase = this.getPhase(sequence);
    const roundResult = db.prepare(
      'INSERT INTO rounds (debate_id, sequence, phase, type, started_at) VALUES (?, ?, ?, ?, ?)'
    ).run(debateId, sequence, phase, 'standard', new Date().toISOString());

    const roundId = roundResult.lastInsertRowid as number;

    // 通知 SSE：轮次开始
    this.sse.broadcast(debateId, {
      type: 'round_start',
      data: { round_id: roundId, sequence, phase },
    });

    // 获取历史上下文
    const history = await this.getHistory(debateId, roundId);

    // Pro 发言
    const proAgent = agents.find(a => a.role === 'debater' && a.stance === 'pro');
    await this.agentSpeak(debateId, roundId, proAgent, {
      topic: debate.topic,
      stance: 'pro',
      phase,
      history,
    });

    // Con 发言
    const conAgent = agents.find(a => a.role === 'debater' && a.stance === 'con');
    await this.agentSpeak(debateId, roundId, conAgent, {
      topic: debate.topic,
      stance: 'con',
      phase,
      history,
    });

    // 裁判评分
    await this.judgeScore(debateId, roundId, agents);

    // 更新轮次完成
    db.prepare('UPDATE rounds SET completed_at = ? WHERE id = ?')
      .run(new Date().toISOString(), roundId);

    // 通知 SSE：轮次结束
    this.sse.broadcast(debateId, {
      type: 'round_end',
      data: { round_id: roundId },
    });
  }

  private async agentSpeak(
    debateId: number,
    roundId: number,
    agent: any,
    inputs: Record<string, unknown>
  ) {
    const db = getDb();

    // 创建辩手 Chain
    const chain = createDebaterChain({
      provider: agent.model_provider,
      model: agent.model_name,
      stance: agent.stance,
    });

    // 通知 SSE：Agent 开始发言
    this.sse.broadcast(debateId, {
      type: 'agent_start',
      data: { agent_id: agent.id, agent_name: agent.stance },
    });

    // 流式生成并发送
    let content = '';
    for await (const token of this.langchain.streamChain(chain, inputs)) {
      content += token;

      // 实时推送 Token
      this.sse.broadcast(debateId, {
        type: 'token',
        data: { token, agent_id: agent.id },
      });
    }

    // 保存到数据库
    db.prepare(
      'INSERT INTO messages (round_id, agent_id, content, created_at) VALUES (?, ?, ?, ?)'
    ).run(roundId, agent.id, content, new Date().toISOString());

    // 通知 SSE：Agent 发言结束
    this.sse.broadcast(debateId, {
      type: 'agent_end',
      data: { agent_id: agent.id, content },
    });
  }

  private async judgeScore(debateId: number, roundId: number, agents: any[]) {
    const db = getDb();

    // 获取本轮发言
    const messages = db.prepare('SELECT * FROM messages WHERE round_id = ?').all(roundId) as any[];
    const proMessages = messages.filter(m => {
      const agent = agents.find(a => a.id === m.agent_id);
      return agent?.stance === 'pro';
    });
    const conMessages = messages.filter(m => {
      const agent = agents.find(a => a.id === m.agent_id);
      return agent?.stance === 'con';
    });

    const judgeAgent = agents.find(a => a.role === 'judge');
    const chain = createJudgeChain({
      provider: judgeAgent.model_provider,
      model: judgeAgent.model_name,
    });

    // 执行裁判 Chain
    const scores = await this.langchain.invokeChain(chain, {
      topic: (db.prepare('SELECT topic FROM debates WHERE id = ?').get(debateId) as any).topic,
      round: roundId.toString(),
      pro_speech: proMessages.map(m => m.content).join('\n'),
      con_speech: conMessages.map(m => m.content).join('\n'),
    }) as any;

    // 保存评分
    for (const [stance, score] of Object.entries(scores)) {
      if (stance === 'pro' || stance === 'con') {
        const agent = agents.find(a => a.stance === stance);
        if (agent) {
          db.prepare(
            'INSERT INTO scores (round_id, agent_id, logic, rebuttal, clarity, evidence, comment) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).run(
            roundId,
            agent.id,
            score.logic,
            score.rebuttal,
            score.clarity,
            score.evidence,
            scores.comment
          );
        }
      }
    }

    // 通知 SSE：评分更新
    this.sse.broadcast(debateId, {
      type: 'score_update',
      data: { round_id: roundId, scores },
    });
  }

  private getPhase(sequence: number): string {
    if (sequence <= 2) return 'opening';
    if (sequence <= 9) return 'rebuttal';
    return 'closing';
  }

  private async getHistory(debateId: number, currentRoundId: number): Promise<string> {
    const db = getDb();
    const messages = db.prepare(`
      SELECT m.content, a.stance, a.role
      FROM messages m
      JOIN agents a ON m.agent_id = a.id
      JOIN rounds r ON m.round_id = r.id
      WHERE r.debate_id = ? AND r.sequence < ?
      ORDER BY m.created_at
    `).all(debateId, currentRoundId) as any[];

    return messages
      .map(m => `[${m.role === 'debater' ? m.stance.toUpperCase() : m.role}]: ${m.content}`)
      .join('\n\n');
  }

  private markAsFailed(debateId: number, error: string) {
    const db = getDb();
    db.prepare('UPDATE debates SET status = ? WHERE id = ?')
      .run('failed', debateId);
  }

  private async calculateFinalResult(debateId: number, agents: any[]) {
    // 计算最终胜负
    // ... 实现细节
  }
}
```

---

## 6. API 路由实现

### 6.1 创建辩论 API

创建 `app/api/debates/route.ts`：

```typescript
// app/api/debates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();

  // 创建辩论
  const result = db.prepare(
    'INSERT INTO debates (topic, pro_definition, con_definition, max_rounds, judge_weight, audience_weight) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    body.topic,
    body.pro_definition || null,
    body.con_definition || null,
    body.max_rounds || 10,
    body.judge_weight || 0.5,
    body.audience_weight || 0.5
  );

  const debateId = result.lastInsertRowid as number;

  // 创建 Agents
  for (const agentConfig of body.agents) {
    const agentId = randomUUID();
    db.prepare(
      'INSERT INTO agents (id, debate_id, role, stance, model_provider, model_name, style_tag, audience_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      agentId,
      debateId,
      agentConfig.role,
      agentConfig.stance || null,
      agentConfig.model_provider,
      agentConfig.model_name,
      agentConfig.style_tag || null,
      agentConfig.audience_type || null
    );
  }

  return NextResponse.json(
    { id: debateId, message: 'Debate created successfully' },
    { status: 201 }
  );
}
```

### 6.2 SSE 流端点

创建 `app/api/debates/[id]/stream/route.ts`：

```typescript
// app/api/debates/[id]/stream/route.ts
import { NextRequest } from 'next/server';
import { SSEService } from '@/lib/services/sse-service';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const debateId = parseInt(params.id);
  const sse = new SSEService();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // 订阅辩论事件
      const unsubscribe = sse.subscribe(debateId, (event) => {
        send(event);
      });

      // 发送连接确认
      send({ type: 'connected', debate_id: debateId });

      // 清理
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

## 7. 运行和测试

### 7.1 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 7.2 查看 LangSmith 追踪（可选）

如果配置了 LangSmith API Key，可以访问 https://smith.langchain.com/ 查看所有 Chain 执行的追踪信息。

---

## 8. 下一步

详细实现计划请参考 [plan.md](./plan.md)

**LangChain 学习资源**:
- 官方文档: https://js.langchain.com/
- LangSmith: https://smith.langchain.com/
- 示例: https://github.com/langchain-ai/langchainjs/tree/main/examples
