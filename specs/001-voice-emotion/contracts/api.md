# API Contracts - 语音与情绪表达功能

**Feature**: 001-voice-emotion
**Version**: 1.0.0
**Date**: 2026-01-02

---

## 概述

本文档定义了语音功能相关的 API 端点。所有端点遵循 RESTful 设计原则，使用 JSON 格式进行数据交换。

**基础路径**: `/api/voice`

**通用响应格式**:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: number;
    requestId: string;
  };
}
```

---

## 端点列表

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

---

## 1. 生成语音

生成指定消息的语音文件。

### 端点

`POST /api/voice/generate`

### 请求体

```typescript
interface GenerateVoiceRequest {
  messageId: number;                    // 必需，消息 ID
  text: string;                         // 必需，要转换的文本内容
  emotionType?: 'intense' | 'neutral' | 'calm';  // 可选，情绪类型
  emotionIntensity?: number;            // 可选，情绪强度 (0.0-1.0)
  voiceProfile?: {                      // 可选，语音配置
    voiceName?: string;                 // TTS 音色 ID
    pitch?: number;                     // 音高调整 (0.5-2.0)
    speed?: number;                     // 语速 (0.5-2.0)
    volume?: number;                    // 音量 (0.0-1.0)
  };
  provider?: 'doubao' | 'aliyun' | 'tencent';  // 可选，TTS 提供商
  forceRegenerate?: boolean;            // 可选，是否强制重新生成
}
```

### 响应

```typescript
interface GenerateVoiceResponse {
  voiceId: number;
  messageId: number;
  audioUrl: string;
  format: 'mp3' | 'wav' | 'opus';
  duration: number;                     // 音频时长（秒）
  fileSize: number;                     // 文件大小（字节）
  emotionType: string;
  emotionIntensity: number;
  generationTime: number;               // 生成耗时（秒）
  cached: boolean;                      // 是否来自缓存
}
```

### 示例

**请求**:
```bash
curl -X POST http://localhost:3000/api/voice/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": 123,
    "text": "这个观点完全错误！我坚决反对。",
    "emotionType": "intense",
    "emotionIntensity": 0.8,
    "provider": "doubao"
  }'
```

**响应**:
```json
{
  "success": true,
  "data": {
    "voiceId": 456,
    "messageId": 123,
    "audioUrl": "https://cdn.example.com/voices/456.mp3",
    "format": "mp3",
    "duration": 3.2,
    "fileSize": 51200,
    "emotionType": "intense",
    "emotionIntensity": 0.8,
    "generationTime": 2.1,
    "cached": false
  },
  "meta": {
    "timestamp": 1735814400,
    "requestId": "req_abc123"
  }
}
```

---

## 2. 获取缓存语音

获取指定消息的缓存语音信息。

### 端点

`GET /api/voice/cache/:messageId`

### 路径参数

- `messageId`: 消息 ID

### 响应

```typescript
interface VoiceCacheResponse {
  voiceId: number;
  messageId: number;
  audioUrl: string;
  format: string;
  duration: number;
  fileSize: number;
  emotionType: string;
  emotionIntensity: number;
  createdAt: number;
  lastAccessedAt: number;
}
```

### 示例

**请求**:
```bash
curl http://localhost:3000/api/voice/cache/123
```

**响应**:
```json
{
  "success": true,
  "data": {
    "voiceId": 456,
    "messageId": 123,
    "audioUrl": "https://cdn.example.com/voices/456.mp3",
    "format": "mp3",
    "duration": 3.2,
    "fileSize": 51200,
    "emotionType": "intense",
    "emotionIntensity": 0.8,
    "createdAt": 1735814400,
    "lastAccessedAt": 1735814500
  }
}
```

**错误响应（未找到缓存）**:
```json
{
  "success": false,
  "error": {
    "code": "VOICE_CACHE_NOT_FOUND",
    "message": "指定消息的语音缓存不存在"
  }
}
```

---

## 3. 获取用户语音设置

获取当前用户的语音偏好设置。

### 端点

`GET /api/voice/settings`

### 响应

```typescript
interface VoiceSettingsResponse {
  userId: string;
  autoPlay: boolean;
  defaultVolume: number;
  playbackSpeed: number;
  voiceEnabled: boolean;
  backgroundPlay: boolean;
  autoAdvance: boolean;
  preferredProvider: string;
}
```

### 示例

**请求**:
```bash
curl http://localhost:3000/api/voice/settings
```

**响应**:
```json
{
  "success": true,
  "data": {
    "userId": "user_abc123",
    "autoPlay": true,
    "defaultVolume": 0.8,
    "playbackSpeed": 1.0,
    "voiceEnabled": true,
    "backgroundPlay": false,
    "autoAdvance": true,
    "preferredProvider": "doubao"
  }
}
```

---

## 4. 更新用户语音设置

更新当前用户的语音偏好设置。

### 端点

`PUT /api/voice/settings`

### 请求体

```typescript
interface UpdateVoiceSettingsRequest {
  autoPlay?: boolean;
  defaultVolume?: number;               // 0.0-1.0
  playbackSpeed?: number;               // 0.5-2.0
  voiceEnabled?: boolean;
  backgroundPlay?: boolean;
  autoAdvance?: boolean;
  preferredProvider?: 'doubao' | 'aliyun' | 'tencent';
}
```

### 响应

```typescript
interface UpdateVoiceSettingsResponse {
  userId: string;
  autoPlay: boolean;
  defaultVolume: number;
  playbackSpeed: number;
  voiceEnabled: boolean;
  backgroundPlay: boolean;
  autoAdvance: boolean;
  preferredProvider: string;
  updatedAt: number;
}
```

### 示例

**请求**:
```bash
curl -X PUT http://localhost:3000/api/voice/settings \
  -H "Content-Type: application/json" \
  -d '{
    "autoPlay": false,
    "defaultVolume": 0.6,
    "playbackSpeed": 1.2
  }'
```

**响应**:
```json
{
  "success": true,
  "data": {
    "userId": "user_abc123",
    "autoPlay": false,
    "defaultVolume": 0.6,
    "playbackSpeed": 1.2,
    "voiceEnabled": true,
    "backgroundPlay": false,
    "autoAdvance": true,
    "preferredProvider": "doubao",
    "updatedAt": 1735814600
  }
}
```

---

## 5. 获取 Agent 语音配置

获取指定 Agent 的语音配置。

### 端点

`GET /api/voice/profiles/:agentId`

### 路径参数

- `agentId`: Agent ID

### 响应

```typescript
interface VoiceProfileResponse {
  agentId: number;
  agentType: 'debater' | 'judge' | 'audience';
  voiceName: string;
  voiceGender?: 'male' | 'female';
  voiceAge?: 'young' | 'middle' | 'mature';
  basePitch: number;
  baseSpeed: number;
  baseVolume: number;
  ttsProvider: string;
}
```

### 示例

**请求**:
```bash
curl http://localhost:3000/api/voice/profiles/5
```

**响应**:
```json
{
  "success": true,
  "data": {
    "agentId": 5,
    "agentType": "debater",
    "voiceName": "zh_male_mature",
    "voiceGender": "male",
    "voiceAge": "mature",
    "basePitch": 1.0,
    "baseSpeed": 1.0,
    "baseVolume": 1.0,
    "ttsProvider": "doubao"
  }
}
```

---

## 6. 更新 Agent 语音配置

更新指定 Agent 的语音配置。

### 端点

`PUT /api/voice/profiles/:agentId`

### 路径参数

- `agentId`: Agent ID

### 请求体

```typescript
interface UpdateVoiceProfileRequest {
  voiceName?: string;
  voiceGender?: 'male' | 'female';
  voiceAge?: 'young' | 'middle' | 'mature';
  basePitch?: number;                   // 0.5-2.0
  baseSpeed?: number;                   // 0.5-2.0
  baseVolume?: number;                  // 0.0-1.0
  ttsProvider?: 'doubao' | 'aliyun' | 'tencent';
}
```

### 响应

与"获取 Agent 语音配置"的响应格式相同。

---

## 7. 创建播放会话

创建新的播放会话（用于复盘报告的连续播放）。

### 端点

`POST /api/voice/playback/session`

### 请求体

```typescript
interface CreatePlaybackSessionRequest {
  debateId: number;                     // 必需，辩论 ID
  playlist: number[];                   // 必需，消息 ID 列表
  repeatMode?: 'none' | 'all' | 'one';  // 可选，重复模式
  shuffle?: boolean;                    // 可选，是否随机播放
}
```

### 响应

```typescript
interface CreatePlaybackSessionResponse {
  sessionId: string;
  debateId: number;
  userId: string;
  status: 'idle' | 'playing' | 'paused' | 'stopped';
  currentMessageId?: number;
  playlist: number[];
  currentPosition: number;
  repeatMode: string;
  shuffle: boolean;
  createdAt: number;
}
```

### 示例

**请求**:
```bash
curl -X POST http://localhost:3000/api/voice/playback/session \
  -H "Content-Type: application/json" \
  -d '{
    "debateId": 10,
    "playlist": [101, 102, 103, 104, 105],
    "repeatMode": "none",
    "shuffle": false
  }'
```

**响应**:
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_xyz789",
    "debateId": 10,
    "userId": "user_abc123",
    "status": "idle",
    "playlist": [101, 102, 103, 104, 105],
    "currentPosition": 0,
    "repeatMode": "none",
    "shuffle": false,
    "createdAt": 1735814700
  }
}
```

---

## 8. 获取播放会话

获取指定播放会话的详细信息。

### 端点

`GET /api/voice/playback/session/:sessionId`

### 路径参数

- `sessionId`: 会话 ID

### 响应

```typescript
interface PlaybackSessionResponse {
  sessionId: string;
  debateId: number;
  userId: string;
  status: string;
  currentMessageId?: number;
  playlist: number[];
  currentPosition: number;
  repeatMode: string;
  shuffle: boolean;
  updatedAt: number;
}
```

---

## 9. 更新播放会话

更新播放会话状态（播放/暂停/跳转）。

### 端点

`PUT /api/voice/playback/session/:sessionId`

### 路径参数

- `sessionId`: 会话 ID

### 请求体

```typescript
interface UpdatePlaybackSessionRequest {
  action: 'play' | 'pause' | 'stop' | 'seek' | 'next' | 'previous';
  position?: number;                    // seek 时使用（秒）
  messageId?: number;                   // 跳转到指定消息
}
```

### 响应

与"获取播放会话"的响应格式相同。

### 示例

**播放**:
```bash
curl -X PUT http://localhost:3000/api/voice/playback/session/sess_xyz789 \
  -H "Content-Type: application/json" \
  -d '{"action": "play"}'
```

**跳转到指定位置**:
```bash
curl -X PUT http://localhost:3000/api/voice/playback/session/sess_xyz789 \
  -H "Content-Type: application/json" \
  -d '{"action": "seek", "position": 30}'
```

**下一首**:
```bash
curl -X PUT http://localhost:3000/api/voice/playback/session/sess_xyz789 \
  -H "Content-Type: application/json" \
  -d '{"action": "next"}'
```

---

## 10. 删除播放会话

删除指定的播放会话。

### 端点

`DELETE /api/voice/playback/session/:sessionId`

### 路径参数

- `sessionId`: 会话 ID

### 响应

```typescript
interface DeletePlaybackSessionResponse {
  sessionId: string;
  deleted: boolean;
}
```

---

## SSE 事件扩展

在现有的 `/api/debates/[id]/stream` SSE 端点中增加以下语音相关事件：

### 事件类型

```typescript
type VoiceStreamEvent =
  | { type: 'voice_generating'; data: { messageId: number; timestamp: number } }
  | { type: 'voice_ready'; data: { messageId: number; audioUrl: string; duration: number } }
  | { type: 'voice_playing'; data: { messageId: number; position: number } }
  | { type: 'voice_paused'; data: { messageId: number; position: number } }
  | { type: 'voice_ended'; data: { messageId: number } }
  | { type: 'voice_error'; data: { messageId: number; error: string } };
```

### 示例

```
event: voice_generating
data: {"messageId":123,"timestamp":1735814400}

event: voice_ready
data: {"messageId":123,"audioUrl":"https://cdn.example.com/voices/456.mp3","duration":3.2}
```

---

## 错误代码

| 代码 | HTTP 状态 | 描述 |
|------|-----------|------|
| `VOICE_SERVICE_UNAVAILABLE` | 503 | TTS 服务不可用 |
| `VOICE_GENERATION_FAILED` | 500 | 语音生成失败 |
| `VOICE_CACHE_NOT_FOUND` | 404 | 语音缓存不存在 |
| `VOICE_PROFILE_NOT_FOUND` | 404 | 语音配置不存在 |
| `INVALID_EMOTION_TYPE` | 400 | 无效的情绪类型 |
| `INVALID_VOICE_PARAMETER` | 400 | 无效的语音参数 |
| `PLAYBACK_SESSION_NOT_FOUND` | 404 | 播放会话不存在 |
| `TTS_PROVIDER_ERROR` | 502 | TTS 提供商错误 |
| `TTS_QUOTA_EXCEEDED` | 429 | TTS 配额超限 |
| `CACHE_SIZE_LIMIT_EXCEEDED` | 507 | 缓存大小超限 |

---

## 通用错误响应格式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: number;
    requestId: string;
    path: string;
  };
}
```

### 示例

```json
{
  "success": false,
  "error": {
    "code": "VOICE_SERVICE_UNAVAILABLE",
    "message": "TTS 服务暂时不可用，请稍后重试",
    "details": {
      "provider": "doubao",
      "retryAfter": 60
    }
  },
  "meta": {
    "timestamp": 1735814400,
    "requestId": "req_error123",
    "path": "/api/voice/generate"
  }
}
```
