import { Router, Request, Response } from 'express';
import { DebateService } from '../services/debate-service.js';
import { LLMService } from '../services/llm-service.js';
import { ContextManager } from '../utils/context.js';
import { AgentFactory } from '../agents/factory.js';
import { CreateDebateRequest, ApiErrorResponse } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * API路由
 * 提供辩论相关的REST API
 */
export function createDebateRoutes(): Router {
  const router = Router();

  // 初始化服务
  const llmService = new LLMService();
  const contextManager = new ContextManager();
  const agentFactory = new AgentFactory({ llmService, contextManager });
  const debateService = new DebateService(llmService, contextManager, agentFactory);

  /**
   * POST /api/debates
   * 创建新辩论
   */
  router.post('/debates', async (req: Request, res: Response) => {
    try {
      const request: CreateDebateRequest = req.body;

      // 验证请求
      if (!request.topic) {
        return res.status(400).json({
          error: '辩题不能为空',
          code: 'INVALID_TOPIC',
        } as ApiErrorResponse);
      }

      if (!request.pro_model || !request.con_model) {
        return res.status(400).json({
          error: '必须指定正反方模型',
          code: 'INVALID_MODELS',
        } as ApiErrorResponse);
      }

      // 创建辩论
      const debate = await debateService.createDebate(request);

      logger.info('创建辩论成功', {
        debateId: debate.id,
        topic: request.topic,
      });

      res.status(201).json({
        debate_id: debate.id,
        topic: debate.topic,
        status: debate.status,
        created_at: debate.createdAt,
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error('创建辩论失败', { error: errorMessage });

      res.status(500).json({
        error: '创建辩论失败',
        code: 'CREATE_FAILED',
        details: { message: errorMessage },
      } as ApiErrorResponse);
    }
  });

  /**
   * GET /api/debates/:id/status
   * 查询辩论状态
   */
  router.get('/debates/:id/status', async (req: Request, res: Response) => {
    try {
      const debateId = parseInt(req.params.id);

      if (isNaN(debateId)) {
        return res.status(400).json({
          error: '无效的辩论ID',
          code: 'INVALID_ID',
        } as ApiErrorResponse);
      }

      const debate = await debateService.getDebate(debateId);

      if (!debate) {
        return res.status(404).json({
          error: '辩论不存在',
          code: 'DEBATE_NOT_FOUND',
        } as ApiErrorResponse);
      }

      // 计算进度
      let progress = 0;
      if (debate.isCompleted()) {
        progress = 100;
      } else if (debate.isActive()) {
        // 假设每轮10%进度
        const rounds = await debateService.getRounds(debateId);
        progress = Math.min(rounds.length * 10, 90);
      }

      res.json({
        debate_id: debate.id,
        status: debate.status,
        current_round: debate.isActive()
          ? (await debateService.getRounds(debateId)).length
          : undefined,
        progress,
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error('查询辩论状态失败', { error: errorMessage });

      res.status(500).json({
        error: '查询失败',
        code: 'QUERY_FAILED',
        details: { message: errorMessage },
      } as ApiErrorResponse);
    }
  });

  /**
   * GET /api/debates/:id/result
   * 获取辩论结果
   */
  router.get('/debates/:id/result', async (req: Request, res: Response) => {
    try {
      const debateId = parseInt(req.params.id);

      if (isNaN(debateId)) {
        return res.status(400).json({
          error: '无效的辩论ID',
          code: 'INVALID_ID',
        } as ApiErrorResponse);
      }

      const debate = await debateService.getDebate(debateId);

      if (!debate) {
        return res.status(404).json({
          error: '辩论不存在',
          code: 'DEBATE_NOT_FOUND',
        } as ApiErrorResponse);
      }

      if (!debate.isCompleted()) {
        return res.status(400).json({
          error: '辩论尚未完成',
          code: 'DEBATE_NOT_COMPLETED',
        } as ApiErrorResponse);
      }

      const result = await debateService.getDebateResult(debateId);

      res.json(result);
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error('获取辩论结果失败', { error: errorMessage });

      res.status(500).json({
        error: '获取结果失败',
        code: 'GET_RESULT_FAILED',
        details: { message: errorMessage },
      } as ApiErrorResponse);
    }
  });

  /**
   * POST /api/debates/:id/start
   * 启动辩论
   */
  router.post('/debates/:id/start', async (req: Request, res: Response) => {
    try {
      const debateId = parseInt(req.params.id);

      if (isNaN(debateId)) {
        return res.status(400).json({
          error: '无效的辩论ID',
          code: 'INVALID_ID',
        } as ApiErrorResponse);
      }

      const debate = await debateService.getDebate(debateId);

      if (!debate) {
        return res.status(404).json({
          error: '辩论不存在',
          code: 'DEBATE_NOT_FOUND',
        } as ApiErrorResponse);
      }

      if (!debate.isPending()) {
        return res.status(400).json({
          error: '辩论状态不正确，无法启动',
          code: 'INVALID_STATUS',
        } as ApiErrorResponse);
      }

      // 异步启动辩论
      debateService.startDebate(debateId).catch(error => {
        logger.error(`辩论 ${debateId} 执行失败`, {
          error: (error as Error).message,
        });
      });

      res.json({
        debate_id: debateId,
        message: '辩论已启动',
        status: 'active',
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error('启动辩论失败', { error: errorMessage });

      res.status(500).json({
        error: '启动失败',
        code: 'START_FAILED',
        details: { message: errorMessage },
      } as ApiErrorResponse);
    }
  });

  /**
   * GET /api/debates
   * 获取辩论列表
   */
  router.get('/debates', async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

      const debates = await debateService.listDebates({
        status: status as any,
        limit,
        offset,
      });

      res.json({
        debates: debates.map(d => ({
          debate_id: d.id,
          topic: d.topic,
          status: d.status,
          created_at: d.createdAt,
          completed_at: d.completedAt,
          winner: d.winner,
        })),
        total: debates.length,
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error('获取辩论列表失败', { error: errorMessage });

      res.status(500).json({
        error: '获取列表失败',
        code: 'LIST_FAILED',
        details: { message: errorMessage },
      } as ApiErrorResponse);
    }
  });

  /**
   * GET /api/debates/:id
   * 获取辩论详情
   */
  router.get('/debates/:id', async (req: Request, res: Response) => {
    try {
      const debateId = parseInt(req.params.id);

      if (isNaN(debateId)) {
        return res.status(400).json({
          error: '无效的辩论ID',
          code: 'INVALID_ID',
        } as ApiErrorResponse);
      }

      const debate = await debateService.getDebate(debateId);

      if (!debate) {
        return res.status(404).json({
          error: '辩论不存在',
          code: 'DEBATE_NOT_FOUND',
        } as ApiErrorResponse);
      }

      const rounds = await debateService.getRounds(debateId);

      res.json({
        debate_id: debate.id,
        topic: debate.topic,
        status: debate.status,
        created_at: debate.createdAt,
        completed_at: debate.completedAt,
        winner: debate.winner,
        rounds: rounds.map(r => ({
          round_id: r.id,
          round_num: r.roundNum,
          phase: r.phase,
          status: r.status,
        })),
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error('获取辩论详情失败', { error: errorMessage });

      res.status(500).json({
        error: '获取详情失败',
        code: 'GET_DETAIL_FAILED',
        details: { message: errorMessage },
      } as ApiErrorResponse);
    }
  });

  /**
   * GET /api/debates/:id/rounds
   * 获取辩论的所有回合
   */
  router.get('/debates/:id/rounds', async (req: Request, res: Response) => {
    try {
      const debateId = parseInt(req.params.id);

      if (isNaN(debateId)) {
        return res.status(400).json({
          error: '无效的辩论ID',
          code: 'INVALID_ID',
        } as ApiErrorResponse);
      }

      const rounds = await debateService.getRounds(debateId);

      res.json({
        debate_id: debateId,
        rounds: await Promise.all(
          rounds.map(async r => ({
            round_id: r.id,
            round_num: r.roundNum,
            phase: r.phase,
            status: r.status,
            messages: await debateService.getRoundMessages(r.id),
            scores: await debateService.getRoundScores(r.id),
          }))
        ),
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error('获取回合列表失败', { error: errorMessage });

      res.status(500).json({
        error: '获取回合列表失败',
        code: 'GET_ROUNDS_FAILED',
        details: { message: errorMessage },
      } as ApiErrorResponse);
    }
  });

  /**
   * GET /api/health
   * 健康检查
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
}

export default createDebateRoutes;
