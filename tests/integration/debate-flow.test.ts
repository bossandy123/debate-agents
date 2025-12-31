/**
 * 辩论流程集成测试
 * 验证完整的10轮辩论流程
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { DebateService } from '../../src/services/debate-service.js';
import { DebateStatus } from '../../src/types/index.js';
import { DatabaseSchema } from '../../src/db/schema.js';
import { LLMService } from '../../src/services/llm-service.js';
import { ContextManager } from '../../src/utils/context.js';
import { AgentFactory } from '../../src/agents/factory.js';

describe('Debate Flow Integration Test', () => {
  let debateService: DebateService;
  let agentFactory: AgentFactory;

  beforeAll(async () => {
    // 初始化数据库
    const schema = new DatabaseSchema();
    await schema.initialize();

    // 创建服务实例
    const llmService = new LLMService();
    const contextManager = new ContextManager();
    agentFactory = new AgentFactory({ llmService, contextManager });
    debateService = new DebateService(llmService, contextManager, agentFactory);
  });

  afterAll(async () => {
    // 清理数据库
    const schema = new DatabaseSchema();
    await schema.truncateAll();
  });

  describe('完整10轮辩论流程', () => {
    test('应能从辩题到完成裁决的完整流程', async () => {
      const topic = '人工智能是否会取代人类工作';

      // 创建辩论
      const debate = await debateService.createDebate({
        topic,
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 10,
      });

      expect(debate.id).toBeDefined();
      expect(debate.topic).toBe(topic);
      expect(debate.status).toBe(DebateStatus.PENDING);

      // 启动辩论（异步执行）
      const resultPromise = debateService.startDebate(debate.id);

      // 等待辩论完成
      const result = await resultPromise;

      // 验证最终状态
      expect(result.winner).toBeDefined();
      expect(['pro', 'con', 'draw']).toContain(result.winner);

      // 验证评分
      expect(result.final_scores).toBeDefined();
      expect(result.final_scores.pro).toBeGreaterThanOrEqual(0);
      expect(result.final_scores.con).toBeGreaterThanOrEqual(0);

      // 验证裁判摘要
      expect(result.judge_summary).toBeDefined();
      expect(result.judge_summary.length).toBeGreaterThan(0);

      // 验证盲点分析
      expect(result.blind_spots).toBeDefined();
      expect(result.blind_spots.pro).toBeDefined();
      expect(result.blind_spots.con).toBeDefined();

      // 验证辩论状态
      const completedDebate = await debateService.getDebate(debate.id);
      expect(completedDebate.status).toBe(DebateStatus.COMPLETED);
      expect(completedDebate.completed_at).toBeDefined();
      expect(completedDebate.winner).toBe(result.winner);
    }, 600000); // 10分钟超时

    test('应正确执行每个阶段的回合', async () => {
      const topic = '远程办公是否会提高工作效率';

      const debate = await debateService.createDebate({
        topic,
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 10,
      });

      await debateService.startDebate(debate.id);

      // 获取所有回合
      const rounds = await debateService.getRounds(debate.id);

      expect(rounds.length).toBe(10);

      // 验证回合阶段分布
      const phases = rounds.map(r => r.phase);
      expect(phases.slice(0, 2)).toEqual(['opening', 'opening']);
      expect(phases.slice(2, 6)).toEqual(['rebuttal', 'rebuttal', 'rebuttal', 'rebuttal']);
      expect(phases.slice(6, 8)).toEqual(['critical', 'critical']);
      expect(phases[8]).toBe('closing');
      expect(phases[9]).toBe('summary');

      // 验证每个回合都有消息
      for (const round of rounds) {
        const messages = await debateService.getRoundMessages(round.id);
        expect(messages.length).toBeGreaterThan(0);
      }
    }, 600000);
  });

  describe('状态转换', () => {
    test('应正确转换状态：pending -> active -> completed', async () => {
      const topic = '是否应该禁止核武器';

      const debate = await debateService.createDebate({
        topic,
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 10,
      });

      expect(debate.status).toBe(DebateStatus.PENDING);

      // 启动辩论（不等待完成）
      debateService.startDebate(debate.id);

      // 短暂延迟后检查状态
      await new Promise(resolve => setTimeout(resolve, 1000));

      const activeDebate = await debateService.getDebate(debate.id);
      expect([DebateStatus.ACTIVE, DebateStatus.COMPLETED]).toContain(activeDebate.status);
    }, 600000);
  });

  describe('错误处理', () => {
    test('应处理LLM API失败并重试', async () => {
      // 这个测试需要mock LLM服务以模拟失败
      // 暂时跳过，待实现mock后再补充
      test.skip('应能从API失败中恢复', async () => {
        // TODO: Mock LLM service to simulate failures
      });
    });

    test('应记录失败辩论的错误信息', async () => {
      // 创建一个必然失败的辩论（使用无效的API密钥）
      const debate = await debateService.createDebate({
        topic: '测试辩论',
        pro_model: 'invalid-model',
        con_model: 'invalid-model',
        max_rounds: 2,
      });

      try {
        await debateService.startDebate(debate.id);
      } catch (error) {
        // 预期会失败
      }

      const failedDebate = await debateService.getDebate(debate.id);
      expect(failedDebate.status).toBe(DebateStatus.FAILED);
      expect(failedDebate.error_message).toBeDefined();
    });
  });

  describe('评分计算', () => {
    test('应正确计算每轮评分', async () => {
      const topic = '气候变化的严重性';

      const debate = await debateService.createDebate({
        topic,
        pro_model: 'gpt-4o',
        con_model: 'gpt-4o',
        max_rounds: 10,
      });

      await debateService.startDebate(debate.id);

      const rounds = await debateService.getRounds(debate.id);

      // 验证每轮都有评分
      for (const round of rounds) {
        const scores = await debateService.getRoundScores(round.id);
        expect(scores.length).toBeGreaterThan(0);

        // 验证评分维度
        for (const score of scores) {
          expect(score.logic).toBeGreaterThanOrEqual(0);
          expect(score.logic).toBeLessThanOrEqual(10);
          expect(score.rebuttal).toBeGreaterThanOrEqual(0);
          expect(score.rebuttal).toBeLessThanOrEqual(10);
          expect(score.clarity).toBeGreaterThanOrEqual(0);
          expect(score.clarity).toBeLessThanOrEqual(10);
          expect(score.evidence).toBeGreaterThanOrEqual(0);
          expect(score.evidence).toBeLessThanOrEqual(10);
          expect(score.total).toBeGreaterThanOrEqual(0);
          expect(score.total).toBeLessThanOrEqual(40);
        }
      }
    }, 600000);
  });

  describe('并发安全', () => {
    test('应能同时处理多个辩论', async () => {
      const topics = [
        '是否应该实施全民基本收入',
        '自动驾驶汽车是否应该被允许',
      ];

      const debates = await Promise.all(
        topics.map(topic =>
          debateService.createDebate({
            topic,
            pro_model: 'gpt-4o',
            con_model: 'gpt-4o',
            max_rounds: 5, // 减少轮数以加快测试
          })
        )
      );

      // 并发启动辩论
      const results = await Promise.all(
        debates.map(debate => debateService.startDebate(debate.id))
      );

      // 验证所有辩论都成功完成
      for (const result of results) {
        expect(result.winner).toBeDefined();
        expect(result.final_scores).toBeDefined();
      }
    }, 600000);
  });
});
