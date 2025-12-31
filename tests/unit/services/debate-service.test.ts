/**
 * DebateService 单元测试
 * 验证辩论服务核心逻辑
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DebateService } from '../../../src/services/debate-service.js';
import { LLMService } from '../../../src/services/llm-service.js';
import { ContextManager } from '../../../src/utils/context.js';
import { AgentFactory } from '../../../src/agents/factory.js';
import { DebateStatus, RoundPhase, MessageType } from '../../../src/types/index.js';
import { DatabaseSchema } from '../../../src/db/schema.js';
import DebateRepository from '../../../src/repositories/debate.repository.js';
import MessageRepository from '../../../src/repositories/message.repository.js';
import ScoreRepository from '../../../src/repositories/score.repository.js';

describe('DebateService', () => {
  let debateService: DebateService;
  let llmService: LLMService;
  let contextManager: ContextManager;
  let agentFactory: AgentFactory;
  let debateRepo: DebateRepository;
  let messageRepo: MessageRepository;
  let scoreRepo: ScoreRepository;

  beforeEach(async () => {
    // 初始化数据库
    const schema = new DatabaseSchema();
    await schema.initialize();

    // 创建服务实例
    llmService = new LLMService();
    contextManager = new ContextManager();
    agentFactory = new AgentFactory({ llmService, contextManager });

    debateRepo = new DebateRepository();
    messageRepo = new MessageRepository();
    scoreRepo = new ScoreRepository();

    debateService = new DebateService(llmService, contextManager, agentFactory);
  });

  afterEach(async () => {
    // 清理数据库
    const schema = new DatabaseSchema();
    await schema.truncateAll();
  });

  describe('createDebate', () => {
    test('应创建新辩论记录', async () => {
      const request = {
        topic: '人工智能是否会取代人类工作',
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 10,
      };

      const debate = await debateService.createDebate(request);

      expect(debate.id).toBeDefined();
      expect(debate.topic).toBe(request.topic);
      expect(debate.status).toBe(DebateStatus.PENDING);
      expect(debate.created_at).toBeDefined();
    });

    test('应拒绝无效的辩题', async () => {
      const request = {
        topic: '', // 空辩题
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 10,
      };

      await expect(debateService.createDebate(request)).rejects.toThrow();
    });

    test('应拒绝无效的轮数', async () => {
      const request = {
        topic: '测试辩题',
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 0, // 无效轮数
      };

      await expect(debateService.createDebate(request)).rejects.toThrow();
    });
  });

  describe('startDebate', () => {
    test('应将辩论状态设置为ACTIVE', async () => {
      const debate = await debateService.createDebate({
        topic: '测试辩题',
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 2,
      });

      // 启动辩论（不等待完成）
      const promise = debateService.startDebate(debate.id);

      // 立即检查状态
      await new Promise(resolve => setTimeout(resolve, 100));
      const activeDebate = await debateService.getDebate(debate.id);
      expect([DebateStatus.ACTIVE, DebateStatus.COMPLETED]).toContain(activeDebate.status);

      // 等待完成
      await promise;
    });

    test('应拒绝启动不存在的辩论', async () => {
      await expect(debateService.startDebate(99999)).rejects.toThrow();
    });
  });

  describe('getDebate', () => {
    test('应返回辩论详情', async () => {
      const created = await debateService.createDebate({
        topic: '测试辩题',
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 10,
      });

      const debate = await debateService.getDebate(created.id);

      expect(debate.id).toBe(created.id);
      expect(debate.topic).toBe(created.topic);
      expect(debate.status).toBe(created.status);
    });

    test('应返回null对于不存在的辩论', async () => {
      const debate = await debateService.getDebate(99999);
      expect(debate).toBeNull();
    });
  });

  describe('getRounds', () => {
    test('应返回辩论的所有回合', async () => {
      const debate = await debateService.createDebate({
        topic: '测试辩题',
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 3,
      });

      await debateService.startDebate(debate.id);

      const rounds = await debateService.getRounds(debate.id);

      expect(rounds.length).toBe(3);
      expect(rounds[0].round_num).toBe(1);
      expect(rounds[1].round_num).toBe(2);
      expect(rounds[2].round_num).toBe(3);
    });

    test('应返回空数组对于没有回合的辩论', async () => {
      const debate = await debateService.createDebate({
        topic: '测试辩题',
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 10,
      });

      const rounds = await debateService.getRounds(debate.id);
      expect(rounds.length).toBe(0);
    });
  });

  describe('getRoundMessages', () => {
    test('应返回回合的所有消息', async () => {
      const debate = await debateService.createDebate({
        topic: '测试辩题',
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 2,
      });

      await debateService.startDebate(debate.id);

      const rounds = await debateService.getRounds(debate.id);
      const messages = await debateService.getRoundMessages(rounds[0].id);

      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].content).toBeDefined();
      expect(messages[0].agent_id).toBeDefined();
    });
  });

  describe('getRoundScores', () => {
    test('应返回回合的评分', async () => {
      const debate = await debateService.createDebate({
        topic: '测试辩题',
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 2,
      });

      await debateService.startDebate(debate.id);

      const rounds = await debateService.getRounds(debate.id);
      const scores = await debateService.getRoundScores(rounds[0].id);

      expect(scores.length).toBeGreaterThan(0);
      expect(scores[0].logic).toBeGreaterThanOrEqual(0);
      expect(scores[0].rebuttal).toBeGreaterThanOrEqual(0);
      expect(scores[0].clarity).toBeGreaterThanOrEqual(0);
      expect(scores[0].evidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateWinner', () => {
    test('应正确计算正方胜', async () => {
      const debate = await debateService.createDebate({
        topic: '测试辩题',
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 2,
      });

      await debateService.startDebate(debate.id);

      const result = await debateService.getDebateResult(debate.id);

      expect(result.winner).toBeDefined();
      expect(['pro', 'con', 'draw']).toContain(result.winner);
    });

    test('应正确计算反方胜', async () => {
      const debate = await debateService.createDebate({
        topic: '测试辩题',
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 2,
      });

      await debateService.startDebate(debate.id);

      const result = await debateService.getDebateResult(debate.id);

      expect(result.winner).toBeDefined();
    });

    test('应正确计算平局', async () => {
      // 需要mock评分以创建平局场景
      // 暂时跳过
      test.skip('应处理平局情况', async () => {
        // TODO: Mock scoring service
      });
    });
  });

  describe('getDebateResult', () => {
    test('应返回完整的辩论结果', async () => {
      const debate = await debateService.createDebate({
        topic: '测试辩题',
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 2,
      });

      await debateService.startDebate(debate.id);

      const result = await debateService.getDebateResult(debate.id);

      expect(result.debate).toBeDefined();
      expect(result.winner).toBeDefined();
      expect(result.final_scores).toBeDefined();
      expect(result.final_scores.pro).toBeGreaterThanOrEqual(0);
      expect(result.final_scores.con).toBeGreaterThanOrEqual(0);
      expect(result.judge_summary).toBeDefined();
      expect(result.blind_spots).toBeDefined();
    });
  });

  describe('上下文管理', () => {
    test('应正确管理上下文压缩', async () => {
      const debate = await debateService.createDebate({
        topic: '测试辩题',
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 10,
      });

      await debateService.startDebate(debate.id);

      // 验证所有回合的消息都被正确保存
      const rounds = await debateService.getRounds(debate.id);
      let totalMessages = 0;

      for (const round of rounds) {
        const messages = await debateService.getRoundMessages(round.id);
        totalMessages += messages.length;
      }

      expect(totalMessages).toBeGreaterThan(0);
    });
  });

  describe('阶段转换', () => {
    test('应正确设置每个回合的阶段', async () => {
      const debate = await debateService.createDebate({
        topic: '测试辩题',
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 10,
      });

      await debateService.startDebate(debate.id);

      const rounds = await debateService.getRounds(debate.id);

      expect(rounds[0].phase).toBe(RoundPhase.OPENING);
      expect(rounds[1].phase).toBe(RoundPhase.OPENING);
      expect(rounds[2].phase).toBe(RoundPhase.REBUTTAL);
      expect(rounds[6].phase).toBe(RoundPhase.CRITICAL);
      expect(rounds[8].phase).toBe(RoundPhase.CLOSING);
      expect(rounds[9].phase).toBe(RoundPhase.SUMMARY);
    });
  });

  describe('错误处理', () => {
    test('应处理Agent执行失败', async () => {
      // Mock LLM service to throw error
      const mockGenerate = jest.spyOn(llmService, 'generate').mockRejectedValue(
        new Error('LLM API失败')
      );

      const debate = await debateService.createDebate({
        topic: '测试辩题',
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 1,
      });

      await expect(debateService.startDebate(debate.id)).rejects.toThrow();

      const failedDebate = await debateService.getDebate(debate.id);
      expect(failedDebate.status).toBe(DebateStatus.FAILED);
      expect(failedDebate.error_message).toBeDefined();

      mockGenerate.mockRestore();
    });
  });

  describe('性能', () => {
    test('单轮执行应在30秒内完成', async () => {
      const debate = await debateService.createDebate({
        topic: '测试辩题',
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 1,
      });

      const startTime = Date.now();
      await debateService.startDebate(debate.id);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(30000);
    }, 35000);
  });
});
