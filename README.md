# AI说 - 多模型 Agent 辩论系统

让不同 AI 模型作为辩手、裁判和观众进行结构化辩论，支持实时语音播放和情绪化表达。

## 核心功能

### 🎭 多模型辩论
- 支持 OpenAI、Anthropic、Google、DeepSeek 等多种 LLM 提供商
- 可配置不同模型担任正方、反方、裁判、观众
- 支持自定义 LLM 端点接入

### 📊 结构化辩论流程
- **立论阶段**: 双方阐述核心论点
- **反驳阶段**: 针对对方观点进行多轮交锋
- **总结阶段**: 总结陈词，强化立场
- 可配置辩论轮数（默认 10 轮）

### ⚖️ AI 裁判评分
- **多维度评分**: 逻辑性、反驳能力、清晰度、论据充分性
- **实时评分**: 每轮结束后立即打分
- **可视化展示**: 评分进度条直观呈现

### 👥 观众参与
- **多类型观众**: 理性型、实用型、技术型、情感型
- **申请发言**: 观众可申请补充观点
- **投票表决**: 观众对最终结果投票

### 🎙️ 语音与情绪表达
- **实时语音播放**: 支持阿里云通义千问 TTS，边生成边播放
- **情绪化语音**: 自动分析发言情绪（激烈/中立/从容），调整语调语速
- **语音个性化**: 可自定义语音风格（男声/女声、年龄段）
- **播放控制**: 支持播放/暂停、速度调节、音量控制
- **连续播放**: 在复盘报告页面连续播放整场辩论

### 📝 复盘报告
- **结果概览**: 获胜方、双方总分、裁判总结
- **过程回放**: 按轮次展示完整辩论过程
- **关键转折**: 标注辩论中的关键时刻
- **Markdown 渲染**: 支持列表、粗体、代码块等格式

### 💾 数据管理
- **历史记录**: 分页浏览所有辩论记录
- **状态筛选**: 按已完成/进行中/失败筛选
- **数据导出**: JSON 格式导出完整辩论数据

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.local.example` 为 `.env.local`：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`，添加你的 API 密钥：

```env
# LLM API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
DEEPSEEK_API_KEY=...

# 语音服务（可选，用于语音播放功能）
ALIYUN_API_KEY=your_aliyun_api_key_here

# 数据库路径
DATABASE_PATH=./data/debates.db
```

### 3. 初始化数据库

```bash
npm run db:init
```

或直接访问 `http://localhost:3000/db` 自动初始化。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000` 开始使用。

## 使用指南

### 创建辩论

1. 填写辩题和正反方立场定义
2. 配置辩论参数（轮数、权重等）
3. 选择 AI 模型配置
4. 点击"创建辩论"

### 观看辩论

- **实时进度**: SSE 推送，实时显示 LLM 生成的每个 Token
- **画布展示**: 消息按轮次分组展示在卡片中
- **Markdown 渲染**: 完整支持 Markdown 格式
- **评分查看**: 点击星星图标查看详细评分

### 语音功能

#### 开启语音
1. 点击辩论页面右上角的"语音设置"按钮
2. 开启"启用语音"开关
3. 配置自动播放、播放速度、音量等参数
4. 语音生成完成后会自动播放

#### 情绪化语音
系统会自动分析发言内容的情绪类型：
- **激烈情绪**: 语调激昂、语速较快
- **中立情绪**: 语调平稳、语速适中
- **从容情绪**: 语调平缓、语速较慢

#### 语音历史回顾
在复盘报告页面，点击"播放整场"按钮连续播放所有发言，支持播放控制（播放/暂停、上一条、下一条）。

### 查看复盘报告

辩论完成后自动生成复盘报告，包含：
- 获胜方和双方总分
- 裁判总结（Markdown 格式）
- 按轮次回放完整辩论过程
- 每轮评分详情和裁判评论

## 技术栈

- **前端**: Next.js 15 (App Router)、React 19、Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: SQLite (better-sqlite3)
- **AI 框架**: LangChain
- **语言**: TypeScript 5

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/debates` | POST | 创建辩论 |
| `/api/debates` | GET | 获取辩论列表（支持分页） |
| `/api/debates/[id]` | GET | 获取辩论详情 |
| `/api/debates/[id]/start` | POST | 启动辩论 |
| `/api/debates/[id]/stop` | POST | 停止辩论 |
| `/api/debates/[id]/stream` | GET | SSE 实时推送辩论进度 |
| `/api/debates/[id]/messages` | GET | 获取辩论消息 |
| `/api/debates/[id]/report` | GET | 获取复盘报告 |
| `/api/debates/[id]/export` | GET | 导出辩论数据（JSON） |
| `/api/voice/generate` | POST | 生成语音 |
| `/api/voice/settings` | GET/PUT | 获取/更新语音设置 |
| `/api/voice/profiles/[agentId]` | GET/PUT | 获取/更新 Agent 语音配置 |

## 项目结构

```
ai-shuo/
├── app/                      # Next.js App Router
│   ├── api/                  # API 路由
│   └── (web)/                # Web 页面
├── components/               # React 组件
│   ├── debate/              # 辩论相关组件
│   └── voice/               # 语音相关组件
├── lib/                     # 业务逻辑
│   ├── agents/              # Agent 层
│   ├── voice/               # 语音功能模块
│   ├── db/                  # 数据库
│   ├── repositories/        # 数据访问层
│   └── services/            # 业务服务
└── data/                    # 数据存储目录
    └── debates.db           # SQLite 数据库
```

## 开发命令

```bash
# 开发服务器
npm run dev

# 构建生产版本
npm run build

# 运行生产版本
npm start

# 初始化数据库
npm run db:init

# 代码检查
npm run lint

# 类型检查
npm run type-check
```

## License

MIT
