# 快速开始指南 - 语音与情绪表达功能

**Feature**: 001-voice-emotion
**Last Updated**: 2026-01-02

---

## 概述

本指南将帮助您快速集成和使用语音功能，包括 TTS 服务配置、情绪识别和音频播放。

---

## 前置条件

1. **Node.js 20+** 已安装
2. **项目依赖** 已安装（`npm install`）
3. **数据库** 已初始化（`npm run db:init`）
4. **TTS 服务 API 密钥**（推荐字节跳动豆包语音或阿里云通义千问）

---

## 1. 环境配置

### 1.1 获取 TTS API 密钥

**字节跳动豆包语音（推荐）**：
1. 访问 [火山引擎控制台](https://console.volcengine.com/speech/service)
2. 创建应用并获取 API Key
3. 记录下 `AccessKey` 和 `SecretKey`

**阿里云通义千问（备选）**：
1. 访问 [阿里云控制台](https://dashscope.console.aliyun.com/)
2. 开通语音合成服务
3. 创建 API Key

### 1.2 配置环境变量

在项目根目录创建或编辑 `.env.local` 文件：

```bash
# TTS 服务配置（豆包语音）
DOUBAO_ACCESS_KEY=your_access_key_here
DOUBAO_SECRET_KEY=your_secret_key_here
DOUBAO_ENDPOINT=https://openspeech.bytedance.com/api/v1/tts

# 或使用阿里云通义千问
ALIYUN_API_KEY=your_api_key_here
ALIYUN_ENDPOINT=https://dashscope.aliyuncs.com/api/v1/services/audio/tts/generation

# 对象存储（用于存储生成的音频文件）
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
OSS_ACCESS_KEY=your_oss_access_key
OSS_SECRET_KEY=your_oss_secret_key
OSS_BUCKET=debate-voices

# 语音功能配置
VOICE_DEFAULT_PROVIDER=doubao  # doubao | aliyun | tencent
VOICE_CACHE_ENABLED=true
VOICE_CACHE_MAX_SIZE_MB=100
VOICE_CACHE_TTL_DAYS=30
```

---

## 2. 数据库迁移

运行数据库迁移脚本，创建语音功能相关的表：

```bash
# 方式一：使用 npm 脚本（推荐）
npm run db:migrate -- --name 001_create_voice_tables.sql

# 方式二：直接执行 SQL
sqlite3 data/debates.db < lib/db/migrations/001_create_voice_tables.sql
```

验证表是否创建成功：

```bash
sqlite3 data/debates.db ".tables"
# 应该看到: voice_profiles voice_cache voice_settings emotion_analyses playback_sessions
```

---

## 3. 安装依赖

安装新增的 npm 包：

```bash
# 核心依赖
npm install howler@2.2.4 crypto-js@4.2.0

# TTS SDK（根据选择的提供商）
# 豆包语音
npm install @volcengine/vega-x

# 或阿里云
npm install @alicloud/dybaseapi

# 开发依赖（已安装，可跳过）
npm install --save-dev @types/howler
```

---

## 4. 代码结构

在现有项目结构中添加以下文件：

```
lib/
├── voice/                           # 新增：语音功能模块
│   ├── tts/                         # TTS 服务
│   │   ├── base.ts                  # TTS 基础接口
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
└── services/
    └── voice.service.ts             # 语音业务逻辑服务

app/api/voice/                       # 新增：语音 API 端点
├── generate/route.ts
├── cache/[messageId]/route.ts
├── settings/route.ts
├── profiles/[agentId]/route.ts
└── playback/
    └── session/[sessionId]/route.ts

components/voice/                    # 新增：语音 UI 组件
├── VoicePlayer.tsx                  # 音频播放器组件
├── VoiceControl.tsx                 # 播放控制按钮
├── VoiceSettings.tsx                # 语音设置面板
└── Waveform.tsx                     # 音频波形可视化
```

---

## 5. 核心功能使用

### 5.1 生成语音

```typescript
// lib/services/voice.service.ts

import { ttsFactory } from '@/lib/voice/tts';
import { emotionAnalyzer } from '@/lib/voice/emotion';

export class VoiceService {
  async generateVoice(messageId: number, text: string) {
    // 1. 分析情绪
    const emotion = await emotionAnalyzer.analyze(text);

    // 2. 获取语音配置
    const profile = await this.getVoiceProfile(messageId);

    // 3. 检查缓存
    const cached = await this.cache.get(messageId, emotion.type);
    if (cached && !this.forceRegenerate) {
      return cached;
    }

    // 4. 调用 TTS API
    const tts = ttsFactory.create(profile.ttsProvider);
    const audioBuffer = await tts.synthesize(text, {
      emotion: emotion.type,
      intensity: emotion.intensity,
      voice: profile.voiceName,
      pitch: profile.basePitch * emotion.pitchShift,
      speed: profile.baseSpeed * emotion.speedMultiplier,
      volume: profile.baseVolume * emotion.volumeBoost
    });

    // 5. 上传到 OSS
    const audioUrl = await this.uploadToOSS(audioBuffer, messageId);

    // 6. 保存到缓存
    await this.cache.set(messageId, {
      audioUrl,
      duration: audioBuffer.duration,
      emotion: emotion.type
    });

    return { audioUrl, duration, emotion };
  }
}
```

### 5.2 情绪分析

```typescript
// lib/voice/emotion/analyzer.ts

import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

const emotionPrompt = PromptTemplate.fromTemplate(`
分析以下辩论发言的情绪特征，返回 JSON 格式：

发言内容：{text}
发言阶段：{stage}  // 立论 | 反驳 | 总结

返回格式：
{{
  "emotion": "intense|neutral|calm",
  "intensity": 0.0-1.0,
  "pitchShift": 0.5-2.0,
  "speedMultiplier": 0.5-2.0,
  "volumeBoost": 0.0-2.0,
  "confidence": 0.0-1.0,
  "reasoning": "判断依据"
}}

规则：
- 反驳阶段通常是 "intense"，语速较快，音量较大
- 总结阶段通常是 "calm"，语速平稳，音量适中
- 立论阶段通常是 "neutral"，语调自然
- 根据标点符号和关键词判断强度（！、？、强烈反对等）
`);

export const emotionAnalyzer = {
  async analyze(text: string, stage: string = 'neutral') {
    const llm = new ChatOpenAI({ temperature: 0 });
    const prompt = await emotionPrompt.format({ text, stage });

    const response = await llm.invoke(prompt);
    const result = JSON.parse(response.content as string);

    return {
      emotionType: result.emotion,
      emotionIntensity: result.intensity,
      pitchShift: result.pitchShift,
      speedMultiplier: result.speedMultiplier,
      volumeBoost: result.volumeBoost,
      confidence: result.confidence,
      reasoning: result.reasoning
    };
  }
};
```

### 5.3 音频播放

```typescript
// components/voice/VoicePlayer.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';

interface VoicePlayerProps {
  audioUrl: string;
  messageId: number;
  autoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
}

export function VoicePlayer({ audioUrl, messageId, autoPlay = false, onPlay, onPause, onEnd }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const soundRef = useRef<Howl | null>(null);

  useEffect(() => {
    // 初始化音频
    soundRef.current = new Howl({
      src: [audioUrl],
      html5: true,  // 支持流式播放
      volume: 0.8,
      onplay: () => {
        setIsPlaying(true);
        onPlay?.();
      },
      onpause: () => {
        setIsPlaying(false);
        onPause?.();
      },
      onend: () => {
        setIsPlaying(false);
        setProgress(0);
        onEnd?.();
      },
      onstop: () => {
        setIsPlaying(false);
        setProgress(0);
      }
    });

    // 自动播放
    if (autoPlay) {
      soundRef.current.play();
    }

    // 进度更新
    const interval = setInterval(() => {
      if (soundRef.current?.playing()) {
        const seek = soundRef.current.seek() as number;
        const duration = soundRef.current.duration();
        setProgress((seek / duration) * 100);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      soundRef.current?.unload();
    };
  }, [audioUrl, autoPlay]);

  const togglePlay = () => {
    if (!soundRef.current) return;

    if (isPlaying) {
      soundRef.current.pause();
    } else {
      soundRef.current.play();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={togglePlay}
        className="p-2 rounded-full hover:bg-gray-200 transition"
        aria-label={isPlaying ? '暂停' : '播放'}
      >
        {isPlaying ? (
          <PauseIcon className="w-5 h-5" />
        ) : (
          <PlayIcon className="w-5 h-5" />
        )}
      </button>

      <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
```

---

## 6. API 端点测试

### 6.1 生成语音

```bash
curl -X POST http://localhost:3000/api/voice/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": 1,
    "text": "这个观点完全错误！我坚决反对这种说法。",
    "emotionType": "intense",
    "emotionIntensity": 0.8,
    "provider": "doubao"
  }'
```

### 6.2 获取语音设置

```bash
curl http://localhost:3000/api/voice/settings
```

### 6.3 更新语音设置

```bash
curl -X PUT http://localhost:3000/api/voice/settings \
  -H "Content-Type: application/json" \
  -d '{
    "autoPlay": true,
    "defaultVolume": 0.8,
    "playbackSpeed": 1.0
  }'
```

---

## 7. 调试与监控

### 7.1 查看 TTS 调用日志

```typescript
// lib/voice/tts/base.ts
export class TTSBase {
  protected async callAPI(text: string, options: any) {
    const startTime = Date.now();

    try {
      console.log(`[TTS] Generating voice for text: "${text.substring(0, 50)}..."`);
      console.log(`[TTS] Options:`, JSON.stringify(options, null, 2));

      const result = await this.apiCall(text, options);

      const duration = (Date.now() - startTime) / 1000;
      console.log(`[TTS] Voice generated successfully in ${duration}s`);

      return result;
    } catch (error) {
      console.error(`[TTS] Error generating voice:`, error);
      throw error;
    }
  }
}
```

### 7.2 监控缓存命中率

```typescript
// lib/voice/cache/index.ts
export class CacheManager {
  private hits = 0;
  private misses = 0;

  async get(key: string) {
    const result = await this.storage.get(key);

    if (result) {
      this.hits++;
      console.log(`[CACHE] Hit - Key: ${key}, Hit Rate: ${this.getHitRate()}%`);
    } else {
      this.misses++;
      console.log(`[CACHE] Miss - Key: ${key}, Hit Rate: ${this.getHitRate()}%`);
    }

    return result;
  }

  getHitRate() {
    const total = this.hits + this.misses;
    return total > 0 ? ((this.hits / total) * 100).toFixed(2) : '0.00';
  }
}
```

---

## 8. 常见问题

### Q1: TTS 服务返回错误 "authentication failed"

**原因**: API 密钥配置错误或已过期

**解决方案**:
1. 检查 `.env.local` 中的 API 密钥是否正确
2. 确认密钥未过期且权限足够
3. 检查服务是否在正确的区域可用

### Q2: 音频播放延迟过高（> 5秒）

**原因**: 可能是缓存未命中或 TTS 服务响应慢

**解决方案**:
1. 启用客户端缓存（IndexedDB）
2. 使用流式 TTS API
3. 预加载下一条消息的语音
4. 检查网络连接

### Q3: 情绪识别不准确

**原因**: Prompt 不够优化或 LLM 选择不当

**解决方案**:
1. 优化情绪分析 Prompt（参考 `lib/voice/emotion/prompts.ts`）
2. 使用更强的 LLM（如 GPT-4）
3. 添加更多示例到 Prompt 中
4. 考虑集成专业情绪分析 API

### Q4: 成本超出预算

**原因**: TTS API 调用过多或缓存未生效

**解决方案**:
1. 检查缓存命中率（目标 > 80%）
2. 使用更便宜的 TTS 提供商（如阿里云）
3. 设置每日调用量上限和告警
4. 定期清理过期缓存

---

## 9. 下一步

- [ ] 完成 P1 功能：基础语音播放
- [ ] 完成 P2 功能：情绪化语音表达
- [ ] 完成 P3 功能：语音个性化设置
- [ ] 完成 P4 功能：语音历史回顾
- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] 性能测试和优化
- [ ] 部署到生产环境

---

## 10. 参考资料

- [豆包语音 API 文档](https://www.volcengine.com/docs/6561/1257584)
- [阿里云语音合成文档](https://help.aliyun.com/zh/model-studio/qwen-tts)
- [Howler.js 官方文档](https://howlerjs.com/)
- [IndexedDB MDN 文档](https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API)
