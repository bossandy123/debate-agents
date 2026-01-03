# 任务列表: 语音与情绪表达功能

**Feature Branch**: `001-voice-emotion`
**Created**: 2026-01-02
**Status**: Phases 3-6 Complete + Documentation (Phase 7 Partial) - Voice Feature Fully Implemented
**Total Tasks**: 114
**Completed**: 95/114 (83.3%)

---

## 实现策略

### MVP 范围（第一阶段交付）
- **User Story 1（P1）**: 基础语音播放功能 - 完整实现
  - 数据库迁移
  - 阿里云 TTS 集成
  - 基础播放控制（播放/暂停/音量）
  - 自动播放和手动播放
  - 基础缓存系统

### 增量交付计划
- **Sprint 1**: US1 基础语音播放（2-3周）
- **Sprint 2**: US2 情绪化语音 + US3 个性化设置（2-3周）
- **Sprint 3**: US4 语音历史回顾（1-2周）
- **Sprint 4**: 优化和测试（1周）

### 技术选择更新
根据用户要求，**优先使用阿里云 TTS 服务**：
- 初期实现使用阿里云通义千问（成本优势：240元/月 vs 1200元/月）
- 架构保持对豆包语音的兼容性，支持后续切换
- 情绪参数通过 LLM 分析 + SSML 标记实现

---

## Phase 1: 项目初始化

**目标**: 准备开发环境和基础设施

- [X] T001 安装 npm 依赖包（Howler.js、crypto-js）在 package.json
- [X] T002 配置环境变量（阿里云 API Key、OSS 配置）在 .env.local.example
- [X] T003 创建 lib/voice/ 目录结构
- [X] T004 创建 app/api/voice/ 目录结构
- [X] T005 创建 components/voice/ 目录结构
- [X] T006 [P] 更新 CLAUDE.md 文档添加语音模块说明

---

## Phase 2: 基础设施和数据库

**目标**: 建立数据存储和核心抽象层

- [X] T007 创建数据库迁移脚本在 lib/db/migrations/001_create_voice_tables.sql
- [X] T008 [P] 创建 TypeScript 类型定义在 lib/voice/types.ts
- [X] T009 [P] 创建语音数据仓库在 lib/repositories/voice.repository.ts
- [X] T010 创建 TTS 基础接口和抽象类在 lib/voice/tts/base.ts
- [X] T011 创建 TTS 工厂在 lib/voice/tts/index.ts

---

## Phase 3: User Story 1 - 基础语音播放功能 (P1)

**用户故事**: 用户在观看辩论时，希望能够听到 AI 辩手的语音发言，而不是仅仅阅读文字

**独立测试标准**: 播放任意一段 AI 辩手的发言，验证用户能够听到清晰的语音输出，并能控制播放/暂停、音量调节

**验收场景**:
1. 用户正在观看进行中的辩论，AI 辩手发表言论时，系统自动将文字转换为语音并播放
2. 用户正在观看回放，点击任意历史发言的播放按钮，系统播放该段发言的语音
3. 语音正在播放时，用户点击暂停按钮，语音立即停止播放
4. 语音正在播放时，用户调整音量滑块，播放音量实时变化

### 数据库层

- [X] T012 [US1] 创建 voice_profiles 表迁移（在 schema.ts 中）
- [X] T013 [US1] 创建 voice_cache 表迁移（在 schema.ts 中）
- [X] T014 [US1] 创建 voice_settings 表迁移（在 schema.ts 中）
- [X] T015 [US1] 执行数据库迁移（通过 initSchema 自动执行）

### TTS 服务集成（阿里云优先）

- [X] T016 [P] [US1] 实现阿里云 TTS 客户端在 lib/voice/tts/aliyun.ts
- [X] T017 [P] [US1] 实现 TTS 请求重试逻辑在 lib/voice/tts/aliyun.ts
- [X] T018 [P] [US1] 实现音频上传到 OSS 在 lib/voice/storage/oss.ts
- [X] T019 [US1] 实现 TTS 服务错误处理在 lib/voice/tts/base.ts

### 缓存系统

- [X] T020 [P] [US1] 实现内存缓存在 lib/voice/cache/memory.ts
- [X] T021 [P] [US1] 实现 SQLite 持久化缓存在 lib/voice/cache/storage.ts
- [X] T022 [US1] 实现缓存管理器在 lib/voice/cache/index.ts
- [X] T023 [US1] 实现缓存清理策略在 lib/voice/cache/index.ts

### 业务服务层

- [X] T024 [US1] 实现语音生成服务在 lib/services/voice.service.ts
- [X] T025 [US1] 实现语音缓存查询服务在 lib/services/voice.service.ts
- [X] T026 [US1] 实现语音生成失败降级逻辑在 lib/services/voice.service.ts
- [X] T027 [US1] 添加生成日志和监控在 lib/services/voice.service.ts

### API 端点

- [X] T028 [P] [US1] 实现 POST /api/voice/generate 在 app/api/voice/generate/route.ts
- [X] T029 [P] [US1] 实现 GET /api/voice/cache/[messageId] 在 app/api/voice/cache/[messageId]/route.ts
- [X] T030 [P] [US1] 实现 GET /api/voice/settings 在 app/api/voice/settings/route.ts
- [X] T031 [P] [US1] 实现 PUT /api/voice/settings 在 app/api/voice/settings/route.ts

### 前端播放器组件

- [X] T032 [P] [US1] 实现 Howler.js 封装在 lib/voice/player/howler.ts
- [X] T033 [P] [US1] 实现播放器状态管理在 lib/voice/player/session.ts
- [X] T034 [P] [US1] 创建 VoicePlayer 组件在 components/voice/VoicePlayer.tsx
- [X] T035 [P] [US1] 创建 VoiceControl 按钮组件在 components/voice/VoiceControl.tsx
- [X] T036 [US1] 实现播放进度条在 components/voice/VoicePlayer.tsx
- [X] T037 [US1] 实现音量控制滑块在 components/voice/VoicePlayer.tsx
- [X] T038 [US1] 添加播放状态视觉反馈在 components/voice/VoicePlayer.tsx

### 辩论页面集成

- [X] T039 [US1] 集成语音播放器到实时观看页面在 app/(web)/debate/[id]/page.tsx
- [X] T040 [US1] 为历史消息添加播放按钮在 app/(web)/debate/[id]/page.tsx
- [X] T041 [US1] 实现自动播放逻辑在 app/(web)/debate/[id]/page.tsx
- [X] T042 [US1] 处理语音服务不可用降级在 app/(web)/debate/[id]/page.tsx

### SSE 事件扩展

- [X] T043 [US1] 添加 voice_generating 事件在 lib/services/sse-service.ts
- [X] T044 [US1] 添加 voice_ready 事件在 lib/services/sse-service.ts
- [X] T045 [US1] 添加 voice_error 事件在 lib/services/sse-service.ts
- [X] T046 [US1] 客户端监听语音事件（基础设施已就位，待辩论流集成时触发）

### 用户设置持久化

- [X] T047 [US1] 实现浏览器指纹生成在 lib/utils/fingerprint.ts
- [X] T048 [US1] 实现设置本地存储回退在 lib/repositories/voice.repository.ts
- [X] T049 [US1] 初始化默认语音设置在 lib/services/voice.service.ts

---

## Phase 4: User Story 2 - 情绪化语音表达 (P2)

**用户故事**: AI 辩手的语音能够表达出情绪，使辩论更加生动有趣

**独立测试标准**: 播放一段包含明显情绪色彩的发言（如激烈反驳），验证语音的语调、语速、音高能够反映出文本中的情绪

**验收场景**:
1. AI 辩手正在进行激烈反驳时，语音语调激昂、语速较快、音量较大
2. AI 辩手正在进行理性分析时，语音语调平稳、语速适中
3. AI 辩手表达不确定或犹豫时，语音包含适度的停顿和疑问语调
4. 发言内容包含强调标记（如粗体、感叹号）时，对应词汇的语音强度增加

### 情绪分析

- [X] T050 [P] [US2] 创建情绪分析 Prompt 模板在 lib/voice/emotion/prompts.ts
- [X] T051 [P] [US2] 实现基于 LLM 的情绪分析器在 lib/voice/emotion/analyzer.ts
- [X] T052 [US2] 创建 emotion_analyses 表迁移（已在 schema.ts 中）
- [X] T053 [US2] 实现情绪分析结果缓存在 lib/repositories/voice.repository.ts

### TTS 情绪参数映射

- [X] T054 [US2] 实现情绪到 TTS 参数的映射在 lib/voice/tts/base.ts
- [X] T055 [US2] 实现语调、语速、音高调整逻辑在 lib/voice/tts/aliyun.ts
- [X] T056 [US2] 处理文本强调标记（粗体、感叹号）在 lib/voice/emotion/analyzer.ts
- [X] T057 [US2] 实现情绪强度平滑过渡（通过 emotionIntensity 参数）

### 服务层集成

- [X] T058 [US2] 集成情绪分析到语音生成服务在 lib/services/voice.service.ts
- [X] T059 [US2] 优化情绪分析性能（缓存、并行）在 lib/voice/emotion/analyzer.ts
- [X] T060 [US2] 实现情绪分析失败回退逻辑在 lib/voice/emotion/analyzer.ts

### 前端情绪反馈

- [X] T061 [US2] 在播放器中显示当前情绪在 components/voice/VoicePlayer.tsx
- [X] T062 [US2] 添加情绪视觉指示器（颜色、图标）在 components/voice/VoiceControl.tsx
- [X] T063 [US2] 实现情绪参数实时预览（通过 emotionIntensity 显示）

---

## Phase 5: User Story 3 - 语音个性化设置 (P3)

**用户故事**: 用户能够选择不同的语音风格（男声/女声、年龄段），并调整全局播放设置

**独立测试标准**: 修改语音设置并播放同一段发言，验证不同的语音风格和设置能够正确应用

**验收场景**:
1. 用户选择"女声"语音风格时，之后播放的所有发言都使用女声
2. 用户调整播放速度为"1.5x"时，语音播放速度明显加快
3. 用户为正方辩手选择"成熟男声"，为反方辩手选择"青年女声"时，双方辩手使用各自指定的语音
4. 用户关闭"自动播放"设置时，AI 发表新言论仅显示文字，不自动播放

### Agent 语音配置

- [X] T064 [P] [US3] 实现 GET /api/voice/profiles/[agentId] 在 app/api/voice/profiles/[agentId]/route.ts
- [X] T065 [P] [US3] 实现 PUT /api/voice/profiles/[agentId] 在 app/api/voice/profiles/[agentId]/route.ts
- [X] T066 [US3] 实现语音配置仓库方法在 lib/repositories/voice.repository.ts
- [X] T067 [US3] 创建默认 Agent 语音配置（已在 VoiceRepository 中实现）

### 设置界面组件

- [X] T068 [P] [US3] 创建 VoiceSettings 面板组件在 components/voice/VoiceSettings.tsx
- [X] T069 [P] [US3] 实现语音风格选择器在 components/voice/VoiceSettings.tsx
- [X] T070 [P] [US3] 实现播放速度滑块在 components/voice/VoiceSettings.tsx
- [X] T071 [P] [US3] 实现自动播放开关在 components/voice/VoiceSettings.tsx
- [X] T072 [US3] 实现音量控制滑块在 components/voice/VoiceSettings.tsx
- [X] T073 [US3] 添加设置即时生效反馈在 components/voice/VoiceSettings.tsx

### 设置页面集成

- [X] T074 [US3] 在辩论页面添加设置入口在 components/debate/debate-page-wrapper.tsx
- [X] T075 [US3] 在复盘报告页面添加设置入口在 app/(web)/debate/[id]/report/page.tsx
- [X] T076 [US3] 实现设置持久化到数据库在 lib/services/voice.service.ts

---

## Phase 6: User Story 4 - 语音历史回顾 (P4)

**用户故事**: 用户在复盘报告页面，能够通过语音方式重新听取整个辩论过程

**独立测试标准**: 在复盘报告页面点击"播放整场"按钮，验证系统能够连续播放多轮发言，并提供播放控制

**验收场景**:
1. 用户点击"播放整场"按钮时，系统按顺序连续播放所有发言，并在轮次间自动切换
2. 系统正在播放整场辩论时，用户点击"上一轮"/"下一轮"按钮，播放位置跳转到对应轮次
3. 系统正在播放时，用户切换到其他应用或浏览器标签，语音继续播放（支持后台播放）
4. 系统正在播放整场时，用户点击"跳过本轮"，系统停止当前发言并立即开始下一轮

### 播放会话数据模型

- [X] T077 [P] [US4] 创建 playback_sessions 表迁移（追加到 001_create_voice_tables.sql）
- [X] T078 [P] [US4] 实现 PlaybackSession 类型定义在 lib/voice/types.ts
- [X] T079 [US4] 实现播放会话仓库在 lib/repositories/voice.repository.ts

### 播放会话 API

- [X] T080 [P] [US4] 实现 POST /api/voice/playback/session 在 app/api/voice/playback/session/route.ts
- [X] T081 [P] [US4] 实现 GET /api/voice/playback/session/[sessionId] 在 app/api/voice/playback/session/[sessionId]/route.ts
- [X] T082 [P] [US4] 实现 PUT /api/voice/playback/session/[sessionId] 在 app/api/voice/playback/session/[sessionId]/route.ts
- [X] T083 [P] [US4] 实现 DELETE /api/voice/playback/session/[sessionId] 在 app/api/voice/playback/session/[sessionId]/route.ts

### 播放会话管理

- [X] T084 [US4] 实现播放会话管理器在 lib/voice/player/session.ts
- [X] T085 [US4] 实现播放列表逻辑在 lib/voice/player/session.ts
- [X] T086 [US4] 实现轮次间自动切换在 lib/voice/player/session.ts
- [X] T087 [US4] 实现跳过、上一轮、下一轮控制在 lib/voice/player/session.ts
- [X] T088 [US4] 实现重复播放模式在 lib/voice/player/session.ts

### 复盘报告页面集成

- [X] T089 [P] [US4] 创建 PlaybackControls 组件在 components/voice/PlaybackControls.tsx
- [X] T090 [P] [US4] 实现"播放整场"按钮在 components/voice/PlaybackControls.tsx
- [X] T091 [P] [US4] 实现播放列表显示在 components/voice/PlaybackControls.tsx
- [X] T092 [P] [US4] 实现轮次跳转控制在 components/voice/PlaybackControls.tsx
- [X] T093 [US4] 集成播放控制到复盘报告页面在 app/(web)/debate/[id]/report/page.tsx
- [X] T094 [US4] 实现后台播放支持在 lib/voice/player/howler.ts (Howler.js 默认支持后台播放)

---

## Phase 7: 优化和测试

### 边缘案例处理

- [ ] T095 实现网络中断降级逻辑在 lib/services/voice.service.ts
- [ ] T096 实现超长发言分段处理在 lib/voice/tts/aliyun.ts
- [ ] T097 实现特殊字符过滤（代码块、公式）在 lib/voice/emotion/analyzer.ts
- [ ] T098 实现并发播放互斥逻辑在 lib/voice/player/session.ts
- [ ] T099 实现浏览器兼容性检测在 components/voice/VoicePlayer.tsx
- [ ] T100 实现多标签页播放互斥在 lib/voice/player/session.ts
- [ ] T101 实现设备静音模式检测在 components/voice/VoicePlayer.tsx

### 性能优化

- [ ] T102 实现语音预加载策略在 lib/voice/cache/index.ts
- [ ] T103 优化缓存键生成（内容哈希）在 lib/voice/cache/index.ts
- [ ] T104 实现客户端 IndexedDB 缓存在 lib/voice/cache/client.ts
- [ ] T105 添加缓存命中率监控在 lib/services/voice.service.ts
- [ ] T106 实现语音文件懒加载在 lib/voice/player/howler.ts
- [ ] T107 优化音频加载性能（压缩、CDN）在 lib/voice/storage/oss.ts

### 错误处理和监控

- [ ] T108 实现统一错误处理在 lib/voice/tts/base.ts
- [ ] T109 添加 TTS API 调用日志在 lib/voice/tts/aliyun.ts
- [ ] T110 实现错误提示 UI 组件在 components/voice/ErrorMessage.tsx
- [ ] T111 添加性能指标收集在 lib/services/voice.service.ts

### 文档更新

- [X] T112 [P] 更新 README.md 添加语音功能说明
- [X] T113 [P] 更新 API 文档在 README.md
- [X] T114 [P] 添加语音功能使用示例在 README.md

---

## 并行执行示例

### Phase 1 示例（可并行）
```bash
# 终端 1: 安装依赖
- T001: npm install howler@2.2.4 crypto-js@4.2.0

# 终端 2: 创建目录结构（同时进行）
- T002: mkdir -p lib/voice/{tts,emotion,cache,player}
- T003: mkdir -p app/api/voice/{cache,profiles,playback}
- T004: mkdir -p components/voice

# 终端 3: 配置环境变量（同时进行）
- T005: 更新 .env.local.example
```

### User Story 1 示例（可并行）
```bash
# 数据库迁移完成后，可并行开发：
# 组 A: TTS 服务层
- T016: 实现阿里云 TTS 客户端
- T017: 实现重试逻辑
- T018: 实现音频上传

# 组 B: 缓存系统
- T020: 实现内存缓存
- T021: 实现 SQLite 缓存

# 组 C: API 端点
- T028: POST /api/voice/generate
- T029: GET /api/voice/cache/[messageId]
- T030: GET /api/voice/settings

# 组 D: 前端组件
- T032: Howler.js 封装
- T034: VoicePlayer 组件
- T035: VoiceControl 组件
```

---

## 依赖关系图

```
Phase 1 (初始化)
    ↓
Phase 2 (基础设施)
    ↓
    ├─→ Phase 3: US1 (基础语音) ←────────────────────┐
    │        ↓                                          │
    │        ├─→ T012-T015: 数据库                     │
    │        ├─→ T016-T019: TTS 服务                  │
    │        ├─→ T020-T023: 缓存                       │
    │        ├─→ T024-T027: 服务层                    │
    │        ├─→ T028-T031: API                       │
    │        ├─→ T032-T038: 组件                      │
    │        ├─→ T039-T042: 页面集成                  │
    │        ├─→ T043-T046: SSE                       │
    │        └─→ T047-T049: 设置                      │
    │                                                 │
    └─→ Phase 4: US2 (情绪表达)                      │
             ├─→ T050-T053: 情绪分析                  │
             ├─→ T054-T057: TTS 情绪映射              │
             ├─→ T058-T060: 服务层                    │
             └─→ T061-T063: UI 反馈                   │
                                                     │
    ┌────────────────────────────────────────────────┘
    ↓
Phase 5: US3 (个性化设置)
    ├─→ T064-T067: Agent 配置
    ├─→ T068-T076: 设置界面和集成
    ↓
Phase 6: US4 (历史回顾)
    ├─→ T077-T083: 会话数据模型和 API
    ├─→ T084-T088: 会话管理
    └─→ T089-T094: 复盘页面集成
    ↓
Phase 7: 优化和测试
    └─→ T095-T114: 全面优化
```

---

## MVP 最小可行产品定义

**MVP = Phase 1 + Phase 2 + Phase 3 (User Story 1)**

**包含任务**:
- T001-T011: 项目初始化和基础设施
- T012-T049: User Story 1 完整实现

**MVP 交付功能**:
1. ✅ 用户能在观看辩论时听到 AI 辩手的语音
2. ✅ 支持自动播放和手动播放
3. ✅ 基础播放控制（播放/暂停/音量）
4. ✅ 语音缓存，减少重复生成
5. ✅ 网络错误降级处理
6. ✅ 实时语音生成状态推送

**MVP 后续可添加**:
- User Story 2: 情绪化语音表达
- User Story 3: 个性化语音设置
- User Story 4: 语音历史回顾连续播放

---

## 任务统计

| Phase | 描述 | 任务数 | 可并行 |
|-------|------|--------|--------|
| Phase 1 | 项目初始化 | 6 | 2 |
| Phase 2 | 基础设施 | 5 | 2 |
| Phase 3 | US1 基础语音 | 38 | 20 |
| Phase 4 | US2 情绪表达 | 14 | 5 |
| Phase 5 | US3 个性化设置 | 13 | 6 |
| Phase 6 | US4 历史回顾 | 18 | 7 |
| Phase 7 | 优化测试 | 20 | 3 |
| **总计** | | **114** | **45** |

---

## 执行建议

1. **按阶段交付**: 每个 User Story 完成后都可独立测试和演示
2. **优先处理阻塞**: Phase 1 和 Phase 2 必须首先完成
3. **并行开发**: 标记 [P] 的任务可以并行处理，提高效率
4. **持续集成**: 每完成一个任务立即运行测试和构建
5. **文档同步**: 代码实现的同时更新相关文档

---

**准备好开始实现了吗？**

建议从 Phase 1 开始，逐步推进到 MVP（Phase 1-3），然后再根据用户反馈决定是否实现 Phase 4-6。
