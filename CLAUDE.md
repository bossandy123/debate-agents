# debate-agents Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-02

## Active Technologies
- TypeScript 5.x, Node.js 20.x, Next.js 15 (App Router) (003-multi-agent-debate-system)
- SQLite (better-sqlite3) - 单文件数据库，适合本地部署和开发 (003-multi-agent-debate-system)
- Howler.js 2.2.4 - 音频播放库 (001-voice-emotion)
- crypto-js 4.2.0 - 内容哈希库 (001-voice-emotion)
- 阿里云通义千问 TTS - 语音合成服务 (001-voice-emotion)

- (001-multi-agent-debate)

## Project Structure

```text
lib/
├── voice/                    # 语音功能模块 (001-voice-emotion)
│   ├── tts/                  # TTS 服务集成
│   ├── emotion/              # 情绪分析
│   ├── cache/                # 缓存管理
│   ├── player/               # 音频播放
│   └── storage/              # OSS 存储
├── repositories/            # 数据访问层
├── services/                # 业务逻辑
└── db/                      # 数据库

app/api/voice/               # 语音 API 端点 (001-voice-emotion)
components/voice/            # 语音 UI 组件 (001-voice-emotion)

tests/                      # 测试文件
```

## Commands

# Add commands for 

## Code Style

: Follow standard conventions

## Recent Changes
- 001-voice-emotion: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]
- 003-multi-agent-debate-system: Added TypeScript 5.x, Node.js 20.x, Next.js 15 (App Router)
- 003-multi-agent-debate-system: Added TypeScript 5.x, Node.js 20.x, Next.js 15 (App Router)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
