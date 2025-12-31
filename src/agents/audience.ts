import { BaseAgent, AgentResult, AgentExecutionContext } from './base.js';
import { MessageType, AudienceStyle, AgentStance } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * 观众Agent类
 * 继承自BaseAgent，实现观众参与辩论的逻辑
 * 注意：这是用户故事2的功能，MVP阶段仅作为占位符
 */
export class AudienceAgent extends BaseAgent {
  /**
   * 执行观众发言
   */
  async execute(context: AgentExecutionContext): Promise<AgentResult> {
    const userPrompt = this.buildUserPrompt(context);
    const content = await this.callLLM(userPrompt);

    return {
      content,
      messageType: MessageType.AUDIENCE_SUPPORT,
    };
  }

  /**
   * 添加角色特定指令
   */
  protected addRoleSpecificInstructions(basePrompt: string): string {
    const styleInstruction = this.getStyleInstruction();

    return `${basePrompt}

作为${this.getStyleName()}观众，你的特点如下：

${styleInstruction}

观众参与规则：
1. 仅在Round 3-6可以申请下场发言
2. 每轮最多1名观众可以发言
3. 需要说明支持哪一方、核心观点、新颖度、置信度
4. 观众发言应引入新视角，而非重复已有论点
5. 发言应简洁（100-200字）`;
  }

  /**
   * 获取风格指令
   */
  private getStyleInstruction(): string {
    const style = this.agent.style_tag;

    switch (style) {
      case AudienceStyle.RATIONAL:
        return `【理性逻辑派】
- 重视逻辑严密性
- 关注论证的结构和推导过程
- 倾向于用数据和事实说话
- 对情感诉求不敏感`;

      case AudienceStyle.PRACTICAL:
        return `【现实可行性派】
- 关注方案的可行性
- 重视实际操作和成本效益
- 对理论和空谈持怀疑态度
- 强调现实约束条件`;

      case AudienceStyle.TECHNICAL:
        return `【技术前瞻派】
- 关注技术发展趋势
- 重视创新和突破
- 对新技术持乐观态度
- 强调技术带来的可能性`;

      case AudienceStyle.RISK_AVERSE:
        return `【风险厌恶派】
- 高度关注潜在风险
- 强调安全和稳定
- 对快速变化持谨慎态度
- 重视经验证的方法`;

      case AudienceStyle.EMOTIONAL:
        return `【情绪共鸣派】
- 重视情感共鸣
- 关注人文关怀
- 对个人故事敏感
- 强调道德和价值观`;

      default:
        return '';
    }
  }

  /**
   * 获取风格名称
   */
  private getStyleName(): string {
    const style = this.agent.style_tag;

    switch (style) {
      case AudienceStyle.RATIONAL:
        return '理性逻辑派';
      case AudienceStyle.PRACTICAL:
        return '现实可行性派';
      case AudienceStyle.TECHNICAL:
        return '技术前瞻派';
      case AudienceStyle.RISK_AVERSE:
        return '风险厌恶派';
      case AudienceStyle.EMOTIONAL:
        return '情绪共鸣派';
      default:
        return '普通';
    }
  }

  /**
   * 获取行动指令
   */
  protected getActionInstruction(): string {
    return `请以${this.getStyleName()}观众的视角，发表你对当前辩论的看法。`;
  }

  /**
   * 构建用户提示词（观众专用）
   */
  protected buildUserPrompt(context: AgentExecutionContext): string {
    const contextStr = this.buildContextString(context);

    return `辩题：${context.topic}
当前轮次：${context.roundNum}
阶段：${context.phase}

${contextStr}

作为${this.getStyleName()}观众，请发表你对当前辩论的看法（100-200字）。

请${this.getActionInstruction()}

你的发言应该：
1. 体现你作为${this.getStyleName()}的视角
2. 提出新的观点或补充
3. 避免重复已有论点`;
  }

  /**
   * 申请下场发言
   */
  async requestToSpeak(
    context: AgentExecutionContext,
    supportStance: AgentStance
  ): Promise<{
    claim: string;
    novelty: 'new' | 'reinforcement';
    confidence: number;
  }> {
    const prompt = this.buildRequestPrompt(context, supportStance);
    const response = await this.callLLM(prompt);

    return this.parseRequestResponse(response);
  }

  /**
   * 构建申请提示词
   */
  private buildRequestPrompt(
    context: AgentExecutionContext,
    supportStance: AgentStance
  ): string {
    const stanceText = supportStance === AgentStance.PRO ? '正方' : '反方';

    return `你是一名${this.getStyleName()}观众，正在观看一场辩论。

辩题：${context.topic}
当前轮次：${context.roundNum}

${this.buildContextString(context)}

你打算支持${stanceText}下场发言。请说明：

1. 你的核心观点是什么？
2. 这是新观点还是对已有观点的强化？
3. 你的置信度有多高（0-100）？

请按照以下JSON格式输出：

\`\`\`json
{
  "claim": "核心观点（50-100字）",
  "novelty": "new" | "reinforcement",
  "confidence": 0-100
}
\`\`\``;
  }

  /**
   * 解析申请响应
   */
  private parseRequestResponse(response: string): {
    claim: string;
    novelty: 'new' | 'reinforcement';
    confidence: number;
  } {
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) ||
                       response.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('无法找到JSON格式的申请结果');
      }

      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

      return {
        claim: parsed.claim || '',
        novelty: ['new', 'reinforcement'].includes(parsed.novelty) ? parsed.novelty : 'new',
        confidence: Math.max(0, Math.min(100, parsed.confidence || 50)),
      };
    } catch (error) {
      logger.warn('解析申请响应失败，使用默认值', {
        error: (error as Error).message,
      });

      return {
        claim: '解析失败',
        novelty: 'new',
        confidence: 50,
      };
    }
  }

  /**
   * 验证生成内容的合法性（观众专用）
   */
  protected validateContent(content: string): boolean {
    // 首先调用基类验证
    if (!super.validateContent(content)) {
      return false;
    }

    // 观众发言应该简洁（50-300字）
    if (content.length < 20) {
      logger.warn(`${this.id} 生成内容过短`, { length: content.length });
      return false;
    }

    if (content.length > 500) {
      logger.warn(`${this.id} 生成内容过长`, { length: content.length });
      return false;
    }

    return true;
  }
}

export default AudienceAgent;
