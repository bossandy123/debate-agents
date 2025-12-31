# Implementation Plan: 辩论可视化前端

**Branch**: `002-debate-visual-frontend` | **Date**: 2025-12-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-debate-visual-frontend/spec.md`

## Summary

为现有的多模型 Agent 辩论后端系统（001-multi-agent-debate）添加一个 Web 可视化前端界面，允许用户：
1. 输入辩题并启动辩论
2. 实时观看 Agent 发言和评分过程
3. 查看历史辩论记录和详情
4. 作为观众参与互动（P3）

前端通过 HTTP API 与现有后端通信，使用轮询方式实现实时更新。

## Technical Context

**Language/Version**: TypeScript 5.7+ (与后端保持一致), JavaScript ES2022+
**Primary Dependencies**: Vue 3.5+, Vue Router, Pinia, TailwindCSS, markstream-vue
**Storage**: 无需本地存储，所有数据通过 API 获取
**Testing**: Vitest, Vue Test Utils, Playwright
**Target Platform**: 现代浏览器 (Chrome 120+, Firefox 120+, Safari 17+, Edge 120+)
**Project Type**: web (前端项目，与现有后端分离)
**Performance Goals**:
- 页面首次加载 < 3 秒
- API 轮询间隔 ≥ 2 秒
- 支持 100+ 并发观看用户
- 实时更新延迟 < 3 秒

**Constraints**:
- 必须使用 TypeScript 严格模式
- 所有 UI 文本使用中文
- 无需用户认证（匿名访问）
- 必须适配移动端和桌面端

**Scale/Scope**:
- 约 15-20 个页面/组件
- 3 个主要用户流程（创建观察、历史记录、观众互动）
- 与现有后端 API 集成

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality**: ✅ TypeScript 严格类型检查 (QR-001)，单元测试覆盖核心逻辑 (QR-002)，ESLint 零错误 (QR-003)，端到端测试 (QR-004)
- **User Experience Consistency**: ✅ 中文错误消息 (UXR-001)，200ms 内的视觉反馈 (UXR-002)，平滑的实时更新 (UXR-003)，响应式设计 (UXR-004)
- **Performance Requirements**: ✅ 页面加载 3 秒内 (PR-001)，轮询间隔 ≥ 2 秒 (PR-002)，虚拟滚动支持长列表 (PR-003)，增量渲染 (PR-004)
- **Documentation Language**: ✅ 所有文档使用中文 (DR-001, DR-002, DR-003)

所有宪章要求已满足，无需违规。

## Project Structure

### Documentation (this feature)

```text
specs/002-debate-visual-frontend/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output
    └── api-schema.yaml  # OpenAPI specification (复用后端)
```

### Source Code (repository root)

这是一个 Web 前端项目，与现有后端共存。前端代码将放在 `frontend/` 目录下：

```text
frontend/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── DebateCard/     # 辩论卡片组件
│   │   ├── MessageBubble/   # 消息气泡组件
│   │   ├── ScoreDisplay/   # 评分展示组件
│   │   ├── ProgressBar/    # 进度条组件
│   │   ├── LoadingSpinner/  # 加载指示器
│   │   └── ErrorAlert/      # 错误提示组件
│   ├── pages/               # 页面组件
│   │   ├── HomePage/       # 首页（辩论列表）
│   │   ├── CreateDebate/   # 创建辩论页面
│   │   ├── DebateLive/     # 辩论实时页面
│   │   ├── DebateDetail/   # 辩论详情页面
│   │   └── AudienceParticipate/ # 观众参与页面
│   ├── services/            # API 服务层
│   │   ├── api.ts         # API 客户端配置
│   │   ├── debateService.ts # 辩论相关 API
│   │   └── types.ts       # TypeScript 类型定义
│   ├── composables/         # Vue Composables
│   │   ├── useDebate.ts    # 辩论状态管理
│   │   ├── usePolling.ts   # 轮询逻辑
│   │   └── useBreakpoints.ts # 响应式断点
│   ├── utils/               # 工具函数
│   │   ├── formatters.ts  # 格式化函数
│   │   └── validators.ts  # 验证函数
│   ├── styles/              # 全局样式
│   │   └── globals.css     # TailwindCSS 全局样式
│   ├── App.vue             # 根组件
│   └── main.ts            # 入口文件
├── public/                  # 静态资源
│   └── favicon.ico
├── tests/                   # 测试文件
│   ├── unit/               # 单元测试
│   ├── integration/        # 集成测试
│   └── e2e/                # 端到端测试
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── tailwind.config.js
└── index.html
```

**Structure Decision**:
- 选择 Option 2 (Web application) 变体
- 前端独立于现有后端代码库，放在 `frontend/` 目录
- 后端保持现有结构在 `src/` 目录
- 前后端通过 HTTP API 通信
- 使用 Vite 作为构建工具（快速、现代化）
- 使用 **Vue 3.5+** + TypeScript（用户明确要求使用 Vue）
- 使用 **markstream-vue** 进行 AI Markdown 流式渲染（专为 AI 聊天场景优化）
- 使用 Pinia 进行状态管理
- 使用 TailwindCSS 进行样式开发（快速、响应式）

## Complexity Tracking

> **无宪章违规**

不适用。

---

## Phase 0: Research & Technical Decisions

### Research Tasks

本阶段需要研究并确定以下技术选型和最佳实践：

1. **Vue 3 生态系统**: 研究 Vue 3.5+ Composition API、Script Setup 语法、响应式系统最佳实践
2. **markstream-vue 集成**: 深入研究 markstream-vue 的流式渲染、增量更新、Mermaid 图表、代码高亮等功能
3. **状态管理方案**: 研究 Pinia 在辩论场景的应用（轮询状态、实时更新、缓存策略）
4. **实时通信方案**: 对比轮询 vs WebSocket vs Server-Sent Events 的优劣（基于现有后端 API）
5. **UI 组件库**: 选择适合 Vue 的组件库（Element Plus、Ant Design Vue、Naive UI 等）
6. **样式方案**: TailwindCSS 与 Vue 3 的集成最佳实践
7. **构建工具**: Vite 与 Vue 3 的配置优化
8. **测试框架**: Vitest + Vue Test Utils + Playwright 的测试策略
9. **响应式设计**: Vue 3 移动端适配方案和最佳实践

---

## Phase 1: Design & Contracts

### Prerequisites

`research.md` 完成后执行此阶段。

### Deliverables

1. **data-model.md**: 前端数据模型定义（TypeScript 接口、状态模型）
2. **contracts/api-schema.yaml**: API 契约（复用后端 OpenAPI 规范）
3. **quickstart.md**: 前端项目快速启动指南

### Agent Context Update

```bash
.specify/scripts/bash/update-agent-context.sh claude
```

---

## Phase 2: Re-evaluation

After Phase 1 design, re-check Constitution gates:

- [ ] Code Quality: TypeScript 配置、测试策略确定
- [ ] User Experience Consistency: 错误处理模式、响应格式确定
- [ ] Performance Requirements: 轮询策略、缓存策略确定
- [ ] Documentation Language: 所有设计文档使用中文

如果发现新的问题，返回 Phase 0 或更新设计。

---

## Next Steps

After Phase 1 and 2 complete:

```bash
# 生成任务列表
/speckit.tasks
```
