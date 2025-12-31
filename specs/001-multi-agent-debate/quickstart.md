# 快速开始指南

**功能**: 多模型Agent辩论系统
**日期**: 2025-12-31

## 环境准备

### 系统要求

- Node.js 20+ (LTS)
- npm 或 pnpm
- SQLite 3（自动包含）

### 安装依赖

```bash
# 克隆仓库
git clone <repository-url>
cd debate-agents

# 安装依赖
npm install
# 或
pnpm install
```

### 环境变量配置

创建 `.env` 文件：

```bash
# LLM API密钥（必需）
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_API_KEY=xxx
DEEPSEEK_API_KEY=sk-xxx

# 数据库配置
DATABASE_PATH=./data/debates.db

# 服务器配置
PORT=3000
NODE_ENV=development

# 日志级别
LOG_LEVEL=info
```

## 启动服务

### 开发模式

```bash
# 启动开发服务器（带热重载）
npm run dev

# 或使用TypeScript直接运行
npm run dev:ts
```

服务将在 `http://localhost:3000` 启动。

### 生产模式

```bash
# 构建TypeScript
npm run build

# 启动生产服务器
npm start
```

## 创建第一场辩论

### 使用cURL

```bash
curl -X POST http://localhost:3000/api/debates \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "人工智能是否会取代人类工作",
    "pro_model": "gpt-4o",
    "con_model": "claude-3-5-sonnet-20241022",
    "audience_count": 5,
    "max_rounds": 10
  }'
```

**响应示例**：

```json
{
  "id": 1,
  "topic": "人工智能是否会取代人类工作",
  "status": "active",
  "created_at": "2025-12-31T10:00:00Z"
}
```

### 使用Node.js客户端

```typescript
import { DebateClient } from '@/client';

const client = new DebateClient('http://localhost:3000/api');

// 创建辩论
const debate = await client.createDebate({
  topic: '人工智能是否会取代人类工作',
  pro_model: 'gpt-4o',
  con_model: 'claude-3-5-sonnet-20241022',
  audience_count: 5,
});

console.log(`辩论已创建，ID: ${debate.id}`);

// 轮询状态
while (true) {
  const status = await client.getDebateStatus(debate.id);
  console.log(`当前回合: ${status.current_round}/10`);

  if (status.status === 'completed') {
    break;
  }

  await sleep(5000); // 等待5秒
}

// 获取结果
const result = await client.getDebateResult(debate.id);
console.log(`胜者: ${result.winner}`);
console.log(`裁判总结: ${result.judge_summary}`);
```

## 查询辩论结果

### 获取完整结果

```bash
curl http://localhost:3000/api/debates/1/result
```

**响应示例**：

```json
{
  "debate": {
    "id": 1,
    "topic": "人工智能是否会取代人类工作",
    "status": "completed",
    "winner": "pro"
  },
  "winner": "pro",
  "final_scores": {
    "pro": 285.5,
    "con": 262.0
  },
  "key_turning_round": 7,
  "blind_spots": {
    "pro": ["未考虑技术伦理问题"],
    "con": ["低估了AI的创造力"]
  },
  "audience_votes": [
    {
      "agent_id": "audience_1",
      "vote": "pro",
      "confidence": 0.78,
      "reason": "正方更符合现实约束"
    }
  ],
  "judge_summary": "正方在逻辑一致性和论证有效性方面表现更佳..."
}
```

### 获取特定回合

```bash
# 获取第7回合详情
curl http://localhost:3000/api/debates/1/rounds/7
```

## 数据库管理

### 查看所有辩论

```bash
# 使用SQLite命令行
sqlite3 data/debates.db

# 查询所有完成的辩论
SELECT id, topic, winner, created_at FROM debates WHERE status = 'completed';
```

### 导出辩论记录

```bash
# 导出为JSON
npm run export:debates -- --format json --output debates.json

# 导出为CSV
npm run export:debates -- --format csv --output debates.csv
```

## 开发指南

### 运行测试

```bash
# 所有测试
npm test

# 单元测试
npm run test:unit

# 集成测试
npm run test:integration

# 测试覆盖率
npm run test:coverage
```

### 代码检查

```bash
# ESLint检查
npm run lint

# 自动修复
npm run lint:fix

# TypeScript类型检查
npm run type-check
```

### 数据库迁移

```bash
# 创建数据库
npm run db:create

# 运行迁移
npm run db:migrate

# 重置数据库
npm run db:reset
```

## 常见问题

### Q: API调用失败怎么办？

检查以下几点：
1. 确认环境变量中的API密钥已正确配置
2. 检查网络连接是否正常
3. 查看日志文件了解详细错误信息

### Q: 辩论一直处于pending状态？

可能原因：
1. LLM API响应超时
2. 数据库连接问题
3. 配置错误

查看日志排查问题：
```bash
# 查看实时日志
npm run logs

# 查看错误日志
cat logs/error.log
```

### Q: 如何重置系统？

```bash
# 停止服务
npm run stop

# 删除数据库
rm data/debates.db

# 重新初始化
npm run db:create
npm run db:migrate

# 重启服务
npm run dev
```

## 下一步

- 阅读 [API文档](./contracts/api-schema.yaml) 了解完整接口
- 查看 [数据模型](./data-model.md) 了解数据库结构
- 参考 [研究文档](./research.md) 了解技术选型

## 获取帮助

- 提交Issue: <repository-url>/issues
- 查看文档: <repository-url>/wiki
- 联系团队: support@debate-agents.com
