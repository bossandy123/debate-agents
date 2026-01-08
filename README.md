# AI Talkshow - AI-Powered Intelligent Debates

让多个 AI Agent 在脱口秀舞台上展开精彩辩论，支持实时语音播放和情绪化表达。

<div align="center">

![Spatial UI](https://img.shields.io/badge/UI-Spatial%20Design-blue)
![Apple Style](https://img.shields.io/badge/Style-Apple%20Aesthetics-purple)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

</div>

## ✨ 特色亮点

### 🎭 智能辩论舞台
- **多模型同台**：OpenAI、Anthropic、Google、DeepSeek 等主流 LLM 同场竞技
- **角色分工明确**：正方辩手、反方辩手、AI 裁判、多类型观众各司其职
- **自定义接入**：支持任意兼容 OpenAI API 的端点

### 📺 脱口秀式体验
- **结构化流程**：立论 → 反驳 → 总结，完整辩论秀
- **实时直播**：SSE 推送，逐 Token 呈现 AI 思考过程
- **情绪化表达**：AI 根据发言情绪调整语调语速

### 🎙️ 智能语音系统
- **阿里云 TTS**：高质量语音合成
- **情绪识别**：自动分析发言情绪（激烈/中立/从容）
- **个性化配置**：语速、音量、语音风格自定义
- **连续播放**：整场辩论一气呵成

### 📊 专业评判体系
- **多维度评分**：逻辑性、反驳力、清晰度、论据充分性
- **实时打分**：每轮结束立即评分
- **可视化展示**：评分进度条直观呈现

## 🚀 快速开始

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

或直接访问应用，数据库会自动初始化。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000` 开始体验 AI Talkshow！

## 💡 使用指南

### 🎬 创建一场辩论秀

1. **设定辩题**：输入有趣的辩题，定义正反方立场
2. **配置参数**：设置辩论轮数、裁判权重等
3. **选择阵容**：为正方、反方、裁判、观众配置 AI 模型
4. **开播**：点击"创建辩论"，准备开始！

### 📺 观看直播

- **实时推流**：SSE 实时推送 AI 生成的每个字
- **画布展示**：消息按轮次分组，清晰呈现辩论节奏
- **评分查看**：点击星星图标查看详细评分
- **语音播放**：开启语音，边看边听

### 🎙️ 语音功能

#### 开启语音
1. 点击页面右上角的"语音设置"按钮
2. 开启"启用语音"开关
3. 配置自动播放、播放速度、音量等参数
4. 语音生成完成后会自动播放

#### 情绪化语音
系统会自动分析发言内容的情绪类型：
- **激烈情绪** 🎯：语调激昂、语速较快（激烈交锋时）
- **中立情绪** 😐：语调平稳、语速适中（正常论述时）
- **从容情绪** 😌：语调平缓、语速较慢（总结陈词时）

### 📝 回顾精彩片段

辩论结束后自动生成完整报告：
- **结果概览**：获胜方、双方总分、裁判总结
- **过程回放**：按轮次展示完整辩论过程
- **评分详情**：每轮评分详情和裁判评论
- **连续播放**：点击"播放整场"按钮连续收听

## 🎨 界面设计

AI Talkshow 采用 **Spatial UI** 设计理念，呈现 Apple 风格的精致体验：

- 🪟 **玻璃态效果**：多层透明与模糊，营造空间深度
- ✨ **流畅动画**：平滑过渡和微交互，灵动自然
- 🌈 **渐变色彩**：精心设计的色彩系统，立场鲜明
- 📱 **响应式设计**：完美适配各种屏幕尺寸

## 🛠️ 技术栈

- **前端框架**：Next.js 15 (App Router)、React 19
- **UI 设计**：Tailwind CSS、Spatial UI、Apple Aesthetics
- **后端**：Next.js API Routes
- **数据库**：SQLite (better-sqlite3)
- **AI 框架**：LangChain
- **语言**：TypeScript 5
- **语音**：阿里云通义千问 TTS

## 📡 API 端点

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

## 📁 项目结构

```
ai-talkshow/
├── app/                      # Next.js App Router
│   ├── api/                  # API 路由
│   ├── (web)/                # Web 页面
│   │   ├── page.tsx          # 首页（Spatial UI）
│   │   ├── create-debate/    # 创建辩论页面
│   │   ├── history/          # 历史记录页面
│   │   └── debate/[id]/      # 辩论详情和报告
│   ├── globals.css           # 全局样式（Spatial UI）
│   └── layout.tsx           # 布局（背景动画）
├── components/               # React 组件
│   ├── ui/                   # 基础 UI 组件（Button、Card、Input、Badge）
│   ├── layout/               # 布局组件（Header）
│   ├── debate/               # 辩论相关组件
│   └── voice/                # 语音相关组件
├── lib/                     # 业务逻辑
│   ├── agents/              # Agent 层
│   ├── voice/               # 语音功能模块
│   ├── db/                  # 数据库
│   ├── repositories/        # 数据访问层
│   └── services/            # 业务服务
├── tailwind.config.ts       # Tailwind 配置（Spatial UI）
└── data/                    # 数据存储目录
```

## 🎬 开发命令

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

## 📝 License

MIT

---

<div align="center">
  <b>AI Talkshow</b> - 让 AI 在脱口秀舞台上展现智慧火花 ⚡
</div>
