# 多模型 Agent 辩论系统

基于 LangChain 和 Next.js 15 的多模型 AI 辩论系统，让不同 LLM 作为辩手、裁判和观众进行结构化辩论。

## 功能特性

- **多模型辩论**: 支持使用不同 LLM 提供商（OpenAI、Anthropic、Google、自定义端点）
- **结构化辩论流程**: 10 轮辩论，包含立论、反驳、总结三个阶段
- **AI 裁判评分**: 自动对每轮发言进行多维度评分（逻辑性、反驳能力、清晰度、论据充分性）
- **观众参与**: 多类型观众 Agent（理性型、实用型、技术型、情感型）可申请发言和投票
- **实时进度**: 使用 Server-Sent Events (SSE) 实时推送辩论进度和流式输出
- **画布展示**: 按轮次分组的画布式消息展示，悬浮评分按钮
- **Markdown 渲染**: 支持 LLM 输出的 Markdown 格式渲染（列表、粗体、代码块等）
- **立场展示**: 辩论页面顶部展示正反方立场定义
- **历史分页**: 辩论历史记录支持分页浏览（每页 20 条）
- **复盘报告**: 自动生成包含评分分析、关键转折、决胜论点的复盘报告（支持 Markdown）
- **数据导出**: 支持 JSON 格式导出完整辩论数据

## 技术栈

- **前端**: Next.js 15 (App Router)、React 19、Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: SQLite (better-sqlite3)
- **AI 框架**: LangChain
- **语言**: TypeScript 5

## 安装

### 前置要求

- Node.js 20+
- npm 或 pnpm

### 步骤

1. 克隆项目
```bash
git clone <repository-url>
cd debate-agents
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量

复制 `.env.local.example` 为 `.env.local` 并配置你的 API 密钥：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`：
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
GOOGLE_API_KEY=...
DATABASE_PATH=./data/debates.db
```

4. 初始化数据库
```bash
npm run db:init
```

或访问 `http://localhost:3000/db` 自动初始化。

5. 启动开发服务器
```bash
npm run dev
```

访问 `http://localhost:3000` 开始使用。

## 使用指南

### 创建辩论

1. 访问首页（创建辩论页面）
2. 填写辩题和正反方定义
3. 配置辩论参数：
   - 辩论轮数（默认 10 轮）
   - 裁判权重（默认 0.5）
   - 观众权重（默认 0.5）
4. 选择 AI 模型配置：
   - 正方辩手模型
   - 反方辩手模型
   - 裁判模型
   - 观众模型（可选）
5. 点击"创建辩论"

### 观看辩论

辩论创建后会自动开始，可以通过以下方式观看：

1. **实时观看**: 点击"观看辩论"进入实时观看页面
2. **立场展示**: 页面顶部显示正反方的立场定义
3. **画布展示**: 消息按轮次分组显示在画布卡片中
4. **流式输出**: 实时看到 LLM 生成的每个 Token（Markdown 格式渲染）
5. **评分查看**: 点击每轮画布右上角的星星图标查看详细评分
6. **进度跟踪**: 显示当前轮次和辩论状态

### 查看复盘报告

辩论完成后，可以查看详细的复盘报告，包含：

- **结果概览**: 获胜方、双方总分
- **裁判总结**: Markdown 格式的裁判评论和分析
- **辩论过程回放**: 按轮次展示完整辩论过程
  - 每轮的阶段标识（立论/反驳/总结）
  - 双方发言内容（Markdown 格式渲染）
  - 本轮评分详情（可视化进度条）
  - 裁判评论（Markdown 格式渲染）

### 查看历史记录

访问 `/history` 页面查看所有历史辩论记录：

- **分页浏览**: 每页显示 20 条记录
- **状态筛选**: 支持按状态筛选（已完成/进行中/失败/等待中）
- **快捷操作**: 快速跳转到观看、回放、导出

## API 端点

| 端点 | 方法 | 描述 | 查询参数 |
|------|------|------|----------|
| `/api/debates` | POST | 创建辩论 | - |
| `/api/debates` | GET | 获取辩论列表 | `page`, `limit`, `status` |
| `/api/debates/[id]` | GET | 获取辩论详情 | - |
| `/api/debates/[id]/start` | POST | 启动辩论 | - |
| `/api/debates/[id]/stop` | POST | 停止辩论 | - |
| `/api/debates/[id]/stream` | GET | SSE 实时推送 | - |
| `/api/debates/[id]/messages` | GET | 获取辩论消息 | - |
| `/api/debates/[id]/report` | GET | 获取复盘报告 | - |
| `/api/debates/[id]/export` | GET | 导出辩论数据 | - |
| `/api/debates/[id]/rounds` | GET | 获取轮次列表 | - |
| `/api/debates/[id]/rounds/[sequence]` | GET | 获取单轮详情 | - |
| `/api/models` | GET | 获取可用模型列表 | - |
| `/db` | POST | 初始化数据库 | - |

### API 详细说明

#### POST `/api/debates` - 创建辩论

**请求体**:
```json
{
  "topic": "辩题",
  "pro_definition": "正方立场定义",
  "con_definition": "反方立场定义",
  "max_rounds": 10,
  "judge_weight": 0.7,
  "audience_weight": 0.3,
  "agents": [
    {
      "id": "unique-id",
      "role": "debater",
      "stance": "pro",
      "model_provider": "openai",
      "model_name": "gpt-4",
      "api_key": "sk-...",
      "base_url": "https://...",
      "style_tag": "rational"
    }
  ]
}
```

**响应**:
```json
{
  "id": 1,
  "message": "辩论创建成功",
  "debate": { ... },
  "agents": [ ... ]
}
```

#### GET `/api/debates` - 获取辩论列表

**查询参数**:
- `page`: 页码（默认 1）
- `limit`: 每页数量（默认 20，最大 100）
- `status`: 状态筛选（`pending`/`running`/`completed`/`failed`）

**响应**:
```json
{
  "debates": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### GET `/api/debates/[id]/messages` - 获取辩论消息

**响应**:
```json
{
  "messages": [
    {
      "id": "1",
      "role": "debater",
      "stance": "pro",
      "content": "发言内容",
      "timestamp": "2026-01-01 12:00:00",
      "roundId": 1
    }
  ],
  "count": 10
}
```

#### GET `/api/debates/[id]/stream` - SSE 实时推送

**事件类型**:
- `connected`: 连接建立
- `debate_start`: 辩论开始
- `round_start`: 轮次开始
- `agent_start`: Agent 开始发言（包含 `round_id`）
- `token`: 流式 Token
- `agent_end`: Agent 发言结束
- `score_update`: 评分更新
- `debate_end`: 辩论结束
- `error`: 错误信息

## 项目结构

```
debate-agents/
├── app/                      # Next.js App Router
│   ├── api/                  # API 路由
│   └── (web)/                # Web 页面
├── components/               # React 组件
│   ├── debate/              # 辩论相关组件
│   └── layout/              # 布局组件
├── lib/                     # 业务逻辑
│   ├── agents/              # Agent 层
│   │   ├── chains/          # LangChain chains
│   │   ├── prompts/         # Prompt 模板
│   │   └── tools/           # LangChain tools
│   ├── db/                  # 数据库
│   ├── models/              # 数据模型
│   ├── repositories/        # 数据访问层
│   └── services/            # 业务服务
└── tests/                   # 测试文件
    ├── unit/                # 单元测试
    ├── integration/         # 集成测试
    └── contract/            # 契约测试
```

## 开发

### 运行测试

```bash
# 单元测试
npm test

# 查看 UI 模式
npm test:ui

# E2E 测试
npx playwright test
```

### 代码检查

```bash
# ESLint
npm run lint

# 类型检查
npm run build
```

## 自定义 LLM 端点

系统支持使用自定义 LLM 端点。在创建辩论时，选择 `custom` 提供商并填写：

- **Base URL**: API 端点地址（如 `https://api.example.com/v1`）
- **API Key**: 认证密钥
- **Model Name**: 模型名称（如 `llama-3-70b`）

## License

MIT
