# Implementation Plan: 语音与情绪表达功能

**Branch**: `001-voice-emotion` | **Date**: 2026-01-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-voice-emotion/spec.md`

## Summary

为多模型辩论系统添加语音播放和情绪化表达功能，使用独立 TTS 服务层架构。用户在观看辩论时可听到 AI 辩手的语音发言，语音能够根据发言内容的情绪（激烈反驳、理性立论、从容总结）调整语调、语速和音高。系统支持自动播放、手动播放控制、语音个性化设置和连续播放回顾。

**技术方案**：
- TTS 服务：字节跳动豆包语音（首选，7种情绪支持）或阿里云通义千问（备选，性价比高）
- 情绪识别：基于现有 LLM 进行文本情绪分析
- 音频缓存：多层缓存（内存 + IndexedDB + OSS对象存储）
- 音频播放：Howler.js 封装 HTML5 Audio API
- 实时推送：扩展现有 SSE 系统增加语音状态事件

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x
**Primary Dependencies**:
- 现有：Next.js 15 (App Router), React 19, LangChain, SQLite (better-sqlite3)
- 新增：Howler.js 2.2.4, @volcengine/vega-x (豆包 SDK) 或 @alicloud/dybaseapi, crypto-js 4.2.0
**Storage**:
- SQLite: 扩展现有数据库，新增 5 张表（voice_profiles, voice_cache, voice_settings, emotion_analyses, playback_sessions）
- OSS: 阿里云 OSS 或类似服务存储音频文件
**Testing**: Vitest (单元测试), Playwright (E2E 测试)
**Target Platform**: Web 浏览器（Chrome 90+, Firefox 88+, Safari 14+, Edge 90+）
**Project Type**: Web (Next.js 全栈应用)
**Performance Goals**:
- 语音生成延迟: 3-5 秒
- 播放启动延迟: < 500ms
- TTS API 响应时间: p95 < 3 秒
- 缓存命中率: > 80%
- 系统可用性: 99.5%
**Constraints**:
- 情绪识别准确率: 85%
- 客户端缓存大小限制: 100MB
- 单场辩论语音内存占用: < 50MB
- TTS 成本控制：月预算 < 1200元（豆包）或 < 240元（阿里云）
**Scale/Scope**:
- 日均 100 场辩论，每场 20 条发言，每条 200 字
- 日总字符数: 40 万字，实际调用量（80% 缓存）: 8 万字

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality**: ✅ 包含完整的 TypeScript 类型定义，核心路径有测试计划，公共 API 有文档
- **User Experience Consistency**: ✅ 错误消息清晰友好，API 响应格式统一，界面稳定（向后兼容），用户操作 < 200ms 反馈
- **Performance Requirements**: ✅ 响应时间明确（3-5秒生成，<500ms启动），资源限制（100MB缓存，50MB内存），缓存策略，异步操作，监控日志
- **Documentation Language**: ✅ 所有文档（spec.md, plan.md, research.md, data-model.md, quickstart.md）均使用中文编写

✅ **所有宪法检查项通过，无需额外理由说明**

## Project Structure

### Documentation (this feature)

```text
specs/001-voice-emotion/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - TTS 服务调研和技术选型
├── data-model.md        # Phase 1 output - 数据库表结构和 TypeScript 类型
├── quickstart.md        # Phase 1 output - 快速开始指南
├── contracts/           # Phase 1 output - API 契约
│   └── api.md           # API 端点定义
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created yet)
```

### Source Code (repository root)

```text
lib/
├── voice/                           # 新增：语音功能模块
│   ├── tts/                         # TTS 服务
│   │   ├── base.ts                  # TTS 基础接口和抽象类
│   │   ├── doubao.ts                # 豆包语音实现
│   │   ├── aliyun.ts                # 阿里云实现
│   │   └── index.ts                 # TTS 工厂
│   ├── emotion/                     # 情绪分析
│   │   ├── analyzer.ts              # 情绪分析器
│   │   └── prompts.ts               # 分析 Prompt 模板
│   ├── cache/                       # 缓存管理
│   │   ├── memory.ts                # 内存缓存
│   │   ├── storage.ts               # 持久化存储
│   │   └── index.ts                 # 缓存管理器
│   └── player/                      # 音频播放
│       ├── howler.ts                # Howler.js 封装
│       └── session.ts               # 播放会话管理
├── repositories/
│   └── voice.repository.ts          # 语音数据仓库
├── services/
│   └── voice.service.ts             # 语音业务逻辑服务
└── db/
    └── migrations/
        └── 001_create_voice_tables.sql  # 数据库迁移脚本

app/api/voice/                       # 新增：语音 API 端点
├── generate/route.ts                # POST /api/voice/generate
├── cache/[messageId]/route.ts       # GET /api/voice/cache/:messageId
├── settings/route.ts                # GET/PUT /api/voice/settings
├── profiles/[agentId]/route.ts      # GET/PUT /api/voice/profiles/:agentId
└── playback/
    └── session/[sessionId]/route.ts # POST/GET/PUT/DELETE /api/voice/playback/session

components/voice/                    # 新增：语音 UI 组件
├── VoicePlayer.tsx                  # 音频播放器组件
├── VoiceControl.tsx                 # 播放控制按钮
├── VoiceSettings.tsx                # 语音设置面板
└── Waveform.tsx                     # 音频波形可视化（可选）
```

**Structure Decision**: 选择 **Web 应用结构**（Option 2），因为项目是 Next.js 全栈应用，语音功能需要：
- **后端**（API Routes）：TTS 集成、情绪分析、缓存管理、会话管理
- **前端**（Components）：播放器 UI、控制界面、设置面板、实时状态展示

## Phase 0: 研究完成 ✅

**输出文件**: [research.md](research.md)

### 关键决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| TTS 服务 | 字节跳动豆包（首选）+ 阿里云（备选） | 豆包支持 7 种情绪，阿里云性价比高（1/5 价格） |
| 情绪识别 | 基于 LLM 分析 | 利用现有 LangChain + LLM，无需额外服务 |
| 缓存策略 | 3 层架构（内存 + IndexedDB + OSS） | 平衡性能和成本，支持离线播放 |
| 播放器 | Howler.js | 兼容性好，API 简单，满足所有需求 |
| 实时推送 | 扩展 SSE | 复用现有架构，最小化改动 |

### 国内 TTS 服务对比

1. **豆包语音**（字节跳动）
   - 情绪支持：7 种（angry, happy, neutral, sad, surprise, fear, disgust）
   - 价格：5元/万字符
   - 优点：情绪支持最全面，流式输出
   - 缺点：价格相对较高

2. **阿里云通义千问**
   - 情绪支持：不明确（需确认）
   - 价格：1元/万字符
   - 优点：价格优势明显，稳定可靠
   - 缺点：情绪参数支持不明确

3. **腾讯云**
   - 情绪支持：SSML 标记，部分音色支持
   - 优点：SSML 细粒度控制
   - 缺点：情绪支持不如豆包全面

4. **百度智能云**
   - 情绪支持：智能情绪预测
   - 优点：价格优势
   - 缺点：情绪参数不够明确

### 成本估算

**使用豆包语音**：月成本约 1200 元
**使用阿里云**：月成本约 240 元

**建议**：初期使用阿里云控制成本，如情绪支持不足再切换豆包。

## Phase 1: 设计完成 ✅

### 数据模型

**输出文件**: [data-model.md](data-model.md)

新增 5 张数据库表：

1. **voice_profiles**: 语音配置（Agent 级别）
2. **voice_cache**: 语音缓存（消息级别）
3. **voice_settings**: 用户语音设置（用户级别）
4. **emotion_analyses**: 情绪分析结果（消息级别）
5. **playback_sessions**: 播放会话（复盘报告连续播放）

### API 契约

**输出文件**: [contracts/api.md](contracts/api.md)

新增 10 个 API 端点：

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/voice/generate` | 生成语音 |
| GET | `/api/voice/cache/:messageId` | 获取缓存语音 |
| GET | `/api/voice/settings` | 获取用户语音设置 |
| PUT | `/api/voice/settings` | 更新用户语音设置 |
| GET | `/api/voice/profiles/:agentId` | 获取 Agent 语音配置 |
| PUT | `/api/voice/profiles/:agentId` | 更新 Agent 语音配置 |
| POST | `/api/voice/playback/session` | 创建播放会话 |
| GET | `/api/voice/playback/session/:sessionId` | 获取播放会话 |
| PUT | `/api/voice/playback/session/:sessionId` | 更新播放会话 |
| DELETE | `/api/voice/playback/session/:sessionId` | 删除播放会话 |

### SSE 事件扩展

在现有 `/api/debates/[id]/stream` 中增加语音相关事件：
- `voice_generating`: 语音生成中
- `voice_ready`: 语音就绪
- `voice_playing`: 播放中
- `voice_paused`: 已暂停
- `voice_ended`: 播放结束
- `voice_error`: 生成/播放错误

### 快速开始指南

**输出文件**: [quickstart.md](quickstart.md)

包含：
- 环境配置（TTS API 密钥）
- 数据库迁移
- 依赖安装
- 代码结构
- 核心功能使用示例
- API 端点测试
- 调试与监控
- 常见问题解答

## Complexity Tracking

> 本项目无需填写此部分，所有宪法检查项均通过，无违规需要说明。

## Phase 2: 任务生成

**下一步**: 运行 `/speckit.tasks` 生成详细的任务列表

**预期任务分类**：
1. 数据库迁移任务
2. TTS 服务集成任务
3. 情绪分析任务
4. 缓存实现任务
5. 播放器实现任务
6. API 端点实现任务
7. UI 组件实现任务
8. 测试任务
9. 文档任务
10. 部署任务

**优先级**：
- **P0（必须）**: 数据库迁移、TTS 基础集成、基础播放功能
- **P1（重要）**: 情绪识别、缓存系统、API 端点
- **P2（增强）**: 高级播放功能、UI 组件优化
- **P3（可选）**: 性能优化、监控告警

---

**Status**: ✅ Phase 0 和 Phase 1 完成，等待 Phase 2 任务生成
