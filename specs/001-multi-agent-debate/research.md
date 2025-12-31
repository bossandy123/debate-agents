# Phase 0 研究报告：技术选型决策

**日期**: 2025-12-31
**功能**: 多模型Agent辩论系统

## 研究摘要

本研究报告针对多模型Agent辩论系统的关键技术选型进行评估，重点比较LangChain.js与Agno框架在多Agent协作场景下的适用性。

---

## 决策1：Agent框架选择

### 决策结果：选择 **LangChain.js**（含LangGraph.js）

### 理由

| 维度 | LangChain.js | Agno | 评估 |
|------|-------------|------|------|
| **TypeScript支持** | 原生支持，完善类型定义 | 支持但生态较新 | LangChain.js更成熟 |
| **多Agent协作** | LangGraph提供显式状态机模型 | Team抽象，内置协作模式 | 各有优势，LangGraph更灵活 |
| **上下文管理** | checkpointer自动持久化 | Agentic Memory自动管理 | LangGraph更适合可追溯辩论 |
| **社区生态** | 庞大，980万月下载 | 成长中，65万月下载 | LangChain生态更完善 |
| **学习曲线** | 中等（需要理解图模型） | 较低（Pythonic风格） | Agno更易上手 |
| **可观测性** | LangSmith深度集成 | AgentOS UI | LangSmith更专业 |
| **价格** | 免费开源，付费$39/月起 | 免费开源，付费$150/月起 | LangChain更经济 |

### 核心优势

**LangChain.js的优势**：
1. **显式状态机模型**：辩论流程是严格的回合制，LangGraph的图模型可以精确控制每轮状态转换
2. **可追溯性**：LangSmith自动追踪每轮执行，便于生成复盘报告
3. **LLM集成**：原生支持OpenAI、Anthropic、Google、DeepSeek等
4. **Human-in-the-Loop**：支持在裁判判定、观众申请等节点暂停请求人工干预
5. **社区支持**：大量示例和最佳实践

**Agno的优势**：
1. **开发速度**：Team抽象简化多Agent协作
2. **内置运行时**：AgentOS提供Web UI监控
3. **性能**：更轻量，启动更快

### 最终选择理由

辩论系统的核心需求是**可追溯性**和**精确控制**：
- 10轮辩论需要严格的状态管理
- 裁判评分、观众申请需要可审计的决策链
- 复盘报告需要完整的执行轨迹

LangGraph的显式图模型和LangSmith的可观测性是决定性因素。

### 替代方案考虑

- **Agno**：适合快速原型开发，但当前阶段选型优先考虑生产可追溯性
- **自研**：不推荐，多Agent框架复杂度高，重复造轮子风险大

---

## 决策2：LLM提供商集成策略

### 决策结果：使用 **LangChain.js统一抽象层**

### 理由

LangChain.js提供统一的`ChatModel`接口，支持：
- **OpenAI**: `ChatOpenAI` (GPT-4, GPT-4o)
- **Anthropic**: `ChatAnthropic` (Claude 3.5 Sonnet)
- **Google**: `ChatGoogleGenerativeAI` (Gemini Pro)
- **DeepSeek**: 通过OpenAI兼容接口

### 错误处理与重试策略

```typescript
// 统一错误处理
- API调用失败：自动重试最多3次
- 超时：设置60秒超时
- 速率限制：指数退避策略
- 内容过滤：跳过违规响应并记录
```

---

## 决策3：上下文管理策略

### 决策结果：**摘要压缩 + 关键信息提取**

### 理由

10轮辩论累积约50-100条消息（含观众发言），可能超出128K token限制。

**策略**：
1. **早期轮次压缩**：Round 1-3在Round 7时压缩为摘要
2. **关键论点保留**：提取每轮核心论据作为结构化数据
3. **裁判评分保留**：评分数据结构化存储，不放入上下文
4. **动态上下文**：根据当前回合选择相关历史

**实现方式**：
- 使用LangGraph的`checkpointer`持久化完整状态
- 每轮构建精简上下文窗口（最近3轮 + 关键论点摘要）
- 裁判Agent可获得完整历史（评分需要全局视角）

---

## 决策4：并发辩论处理

### 决策结果：**辩论级别隔离 + SQLite行级锁**

### 理由

支持10场并发辩论，需要防止状态混淆。

**策略**：
1. **DebateSession隔离**：每场辩论拥有独立的会话ID和状态图
2. **SQLite事务**：使用WAL模式支持并发读
3. **内存隔离**：每场辩论的Agent实例不共享
4. **资源池**：LLM连接池限制总并发请求数

**架构**：
```
DebateService
  ├── createDebate() → 生成唯一debateId
  ├── getDebateState(debateId) → 从SQLite加载状态
  └── executeRound(debateId, roundNum) → 隔离执行
```

---

## 技术栈总结

| 组件 | 选择 | 版本 |
|------|------|------|
| 运行时 | Node.js | 20+ LTS |
| 语言 | TypeScript | 5.x |
| Agent框架 | LangChain.js + LangGraph.js | 最新 |
| ORM | better-sqlite3 | 最新 |
| 测试 | Jest + ts-mockito | 最新 |
| 代码检查 | ESLint + Prettier | 最新 |
| LLM集成 | LangChain统一抽象 | - |

---

## 参考资源

### LangChain.js相关
- [LangChain.js官方文档](https://docs.langchain.com/oss/javascript/langchain/overview)
- [LangGraph官方站点](https://www.langchain.com/langgraph)
- [使用JavaScript和LangGraph构建AI Agent](https://javascript-conference.com/blog/build-ai-agents-javascript-langgraph/)
- [LangGraph Typescript示例仓库](https://github.com/langchain-ai/agents-from-scratch-ts)
- [LangGraph多Agent工作流](https://blog.langchain.com/langgraph-multi-agent-workflows/)

### Agno相关
- [Agno GitHub仓库](https://github.com/agno-agi/agno)
- [Agno vs LangGraph对比](https://www.zenml.io/blog/agno-vs-langgraph)

### 其他框架参考
- [Mastra: TypeScript AI框架](https://mastra.ai/)
