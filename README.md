# 多模型 Agent 辩论系统

基于 LangChain 和 Next.js 15 的多模型 AI 辩论系统，让不同 LLM 作为辩手、裁判和观众进行结构化辩论。

## 功能特性

- **多模型辩论**: 支持使用不同 LLM 提供商（OpenAI、Anthropic、Google、自定义端点）
- **结构化辩论流程**: 10 轮辩论，包含立论、反驳、总结三个阶段
- **AI 裁判评分**: 自动对每轮发言进行多维度评分（逻辑性、反驳能力、清晰度、论据充分性）
- **观众参与**: 多类型观众 Agent（理性型、实用型、技术型、情感型）可申请发言和投票
- **实时进度**: 使用 Server-Sent Events (SSE) 实时推送辩论进度
- **复盘报告**: 自动生成包含评分分析、关键转折、决胜论点的复盘报告
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
2. **查看进度**: 进度条显示当前轮次
3. **查看日志**: 实时日志显示辩论事件

### 查看复盘报告

辩论完成后，可以查看详细的复盘报告，包含：

- 最终裁决（胜负判定）
- 每轮评分汇总
- 关键转折轮次
- 决胜论点
- 观众投票分析
- 双方盲点分析

### 查看历史记录

访问 `/history` 页面查看所有历史辩论记录。

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/debates` | POST | 创建辩论 |
| `/api/debates` | GET | 获取辩论列表 |
| `/api/debates/[id]` | GET | 获取辩论详情 |
| `/api/debates/[id]/start` | POST | 启动辩论 |
| `/api/debates/[id]/stop` | POST | 停止辩论 |
| `/api/debates/[id]/stream` | GET | SSE 实时推送 |
| `/api/debates/[id]/report` | GET | 获取复盘报告 |
| `/api/debates/[id]/export` | GET | 导出辩论数据 |
| `/api/debates/[id]/rounds` | GET | 获取轮次列表 |
| `/api/debates/[id]/rounds/[sequence]` | GET | 获取单轮详情 |
| `/api/models` | GET | 获取可用模型列表 |
| `/db` | POST | 初始化数据库 |

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
