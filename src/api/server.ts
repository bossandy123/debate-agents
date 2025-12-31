import express, { Application } from 'express';
import { createDebateRoutes } from './routes.js';
import { logger } from '../utils/logger.js';
import { DatabaseSchema } from '../db/schema.js';
import DatabaseConnection from '../db/connection.js';

/**
 * 创建并配置Express应用
 */
export async function createApp(): Promise<Application> {
  const app = express();

  // 中间件
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 请求日志
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      query: req.query,
      body: req.body?.topic ? { topic: req.body.topic } : undefined,
    });
    next();
  });

  // CORS
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });

  // 路由
  app.use('/api', createDebateRoutes());

  // 404处理
  app.use((_req, res) => {
    res.status(404).json({
      error: '未找到请求的资源',
      code: 'NOT_FOUND',
    });
  });

  // 错误处理
  app.use((err: Error, _req: any, res: any, _next: any) => {
    logger.error('服务器错误', { error: err.message });
    res.status(500).json({
      error: '服务器内部错误',
      code: 'INTERNAL_ERROR',
      details: { message: err.message },
    });
  });

  return app;
}

/**
 * 启动服务器
 */
export async function startServer(port: number = 3000): Promise<void> {
  try {
    // 初始化数据库
    const schema = new DatabaseSchema(DatabaseConnection.getConnection());
    await schema.initialize();
    logger.info('数据库初始化完成');

    // 创建应用
    const app = await createApp();

    // 启动服务器
    app.listen(port, () => {
      logger.info(`服务器启动成功`, {
        port,
        env: process.env.NODE_ENV || 'development',
      });
    });
  } catch (error) {
    logger.error('服务器启动失败', {
      error: (error as Error).message,
    });
    process.exit(1);
  }
}

export default { createApp, startServer };
