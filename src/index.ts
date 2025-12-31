/**
 * 多模型Agent辩论系统
 * 主入口文件
 */

import 'dotenv/config';
import { startServer } from './api/server.js';
import { logger } from './utils/logger.js';

// 从环境变量获取端口，默认3000
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// 启动服务器
startServer(PORT).catch(error => {
  logger.error('应用启动失败', { error: (error as Error).message });
  process.exit(1);
});

// 导出主要模块供外部使用
export * from './types/index.js';
export * from './models/debate.js';
export * from './models/round.js';
export * from './models/message.js';
export * from './models/score.js';
export * from './services/debate-service.js';
export * from './services/llm-service.js';
export * from './agents/base.js';
export * from './agents/debater.js';
export * from './agents/judge.js';
export * from './agents/factory.js';
export { default as DebateAgent } from './agents/debater.js';
export { default as JudgeAgent } from './agents/judge.js';
export { default as AgentFactory } from './agents/factory.js';
export { default as DebateService } from './services/debate-service.js';
export { default as LLMService } from './services/llm-service.js';
