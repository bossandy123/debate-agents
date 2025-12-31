import { Message, Round } from '../types/index.js';

/**
 * 上下文摘要接口
 */
export interface ContextSummary {
  summary: string;
  keyPoints: string[];
  roundSummaries: Record<number, string>;
}

/**
 * 上下文管理类
 * 负责管理辩论过程中的上下文信息
 * 实现摘要压缩策略以避免超出token限制
 */
export class ContextManager {
  private readonly maxTokens: number;
  private readonly summaryThreshold: number;

  constructor(maxTokens: number = 100000, summaryThreshold: number = 3) {
    this.maxTokens = maxTokens;
    this.summaryThreshold = summaryThreshold;
  }

  /**
   * 构建当前回合的上下文
   * @param currentRoundNum 当前回合序号
   * @param allMessages 所有历史消息
   * @param summary 上下文摘要（如果已压缩）
   * @returns 格式化的上下文字符串
   */
  buildContext(
    currentRoundNum: number,
    allMessages: Message[],
    summary?: ContextSummary
  ): string {
    let contextParts: string[] = [];

    // 添加摘要（如果有）
    if (summary && currentRoundNum > this.summaryThreshold) {
      contextParts.push(`=== 历史辩论摘要 ===\n${summary.summary}`);
      contextParts.push(`\n=== 关键论点 ===\n${summary.keyPoints.join('\n')}`);
    } else {
      // 无摘要时包含早期轮次消息
      const earlyMessages = allMessages.filter(m => {
        const roundNum = Math.floor(m.id / 100000); // 简化估算
        return roundNum < currentRoundNum - 2;
      });

      if (earlyMessages.length > 0) {
        contextParts.push('=== 早期发言 ===');
        earlyMessages.forEach(m => {
          contextParts.push(`${m.agent_id}: ${m.content}`);
        });
      }
    }

    // 添加最近3轮的完整消息
    const recentMessages = allMessages.slice(-30); // 简化处理
    if (recentMessages.length > 0) {
      contextParts.push('\n=== 最近发言 ===');
      recentMessages.forEach(m => {
        contextParts.push(`[回合${Math.floor(m.id / 100000) + 1}] ${m.agent_id}: ${m.content}`);
      });
    }

    return contextParts.join('\n\n');
  }

  /**
   * 生成上下文摘要
   * @param allMessages 所有消息
   * @param rounds 所有回合
   * @returns 摘要信息
   */
  async generateSummary(allMessages: Message[], rounds: Round[]): Promise<ContextSummary> {
    // 按回合分组消息
    const messagesByRound = new Map<number, Message[]>();
    for (const message of allMessages) {
      const roundMessages = messagesByRound.get(message.round_id) || [];
      roundMessages.push(message);
      messagesByRound.set(message.round_id, roundMessages);
    }

    // 提取关键论点（简化版）
    const keyPoints: string[] = [];
    const roundSummaries: Record<number, string> = [];

    rounds.forEach(round => {
      const messages = messagesByRound.get(round.id) || [];
      if (messages.length === 0) return;

      // 提取该回合的核心论点
      const roundSummary = this.summarizeRound(round, messages);
      roundSummaries[round.round_num] = roundSummary;

      // 提取关键论点（识别带"我认为"、"我的观点是"等表述）
      messages.forEach(m => {
        if (m.message_type === 'argument') {
          keyPoints.push(`回合${round.round_num} ${m.agent_id}: ${this.extractKeyPoint(m.content)}`);
        }
      });
    });

    const summary = `辩论共进行${rounds.length}轮，双方就辩题展开多轮论证。${keyPoints.slice(0, 5).join('；')}。`;

    return {
      summary,
      keyPoints,
      roundSummaries,
    };
  }

  /**
   * 摘要单个回合
   */
  private summarizeRound(round: Round, messages: Message[]): string {
    const speakerCounts = new Map<string, number>();
    messages.forEach(m => {
      const count = speakerCounts.get(m.agent_id) || 0;
      speakerCounts.set(m.agent_id, count + 1);
    });

    const speakers = Array.from(speakerCounts.entries())
      .map(([agent, count]) => `${agent}(${count}次)`)
      .join(', ');

    return `回合${round.round_num} (${round.phase}): ${speakers}发言`;
  }

  /**
   * 从内容中提取关键论点
   */
  private extractKeyPoint(content: string): string {
    // 简化实现：取第一句话或前100个字符
    const firstSentence = content.split(/[。！？.!?]/)[0];
    return firstSentence.length > 100 ? firstSentence.substring(0, 100) + '...' : firstSentence;
  }

  /**
   * 估算上下文token数量
   * 这是一个粗略估计，实际应使用tokenizer
   */
  estimateTokens(text: string): number {
    // 简单估算：中文约1.5字符=1token，英文约4字符=1token
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const nonChineseChars = text.length - chineseChars;
    return Math.ceil(chineseChars / 1.5 + nonChineseChars / 4);
  }

  /**
   * 检查上下文是否需要压缩
   */
  needsCompression(context: string): boolean {
    return this.estimateTokens(context) > this.maxTokens * 0.8;
  }

  /**
   * 裁判Agent专用：获取完整历史上下文
   * 裁判需要全局视角来评分，所以应获得完整历史
   */
  buildJudgeContext(allMessages: Message[], currentRoundNum: number): string {
    let contextParts: string[] = [];

    contextParts.push(`=== 辩论历史 (第1-${currentRoundNum}轮) ===\n`);

    allMessages.forEach((m, index) => {
      const roundNum = Math.floor(index / 2) + 1; // 简化估算
      contextParts.push(`[R${roundNum}] ${m.agent_id}: ${m.content}`);
    });

    return contextParts.join('\n');
  }

  /**
   * 格式化Agent系统提示词
   */
  formatSystemPrompt(role: string, stance?: string): string {
    let prompt = `你是一个${role}。`;

    if (stance) {
      prompt += `你的立场是${stance === 'pro' ? '正方' : '反方'}。`;
    }

    prompt += '\n\n请遵循辩论规则，清晰、有条理地表达你的观点。';

    return prompt;
  }

  /**
   * 格式化轮次提示词
   */
  formatRoundPrompt(roundNum: number, phase: string, topic: string): string {
    return `现在进行第${roundNum}轮辩论（${phase}阶段）。\n辩题：${topic}\n\n请根据当前辩论状态发表你的观点。`;
  }
}

export default ContextManager;
