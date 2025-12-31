import { BaseAgent, AgentResult, AgentExecutionContext } from './base.js';
import { MessageType, RoundPhase, AgentStance } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * 辩手Agent类
 * 继承自BaseAgent，实现辩手的核心逻辑
 */
export class DebaterAgent extends BaseAgent {
  /**
   * 执行辩手发言
   */
  async execute(context: AgentExecutionContext): Promise<AgentResult> {
    const userPrompt = this.buildUserPrompt(context);
    const content = await this.callLLM(userPrompt);

    return {
      content,
      messageType: this.getMessageType(context),
    };
  }

  /**
   * 根据回合阶段确定消息类型
   */
  private getMessageType(context: AgentExecutionContext): MessageType {
    // 立论阶段使用argument
    if (context.phase === RoundPhase.OPENING) {
      return MessageType.ARGUMENT;
    }

    // 总结陈词也使用argument
    if (context.phase === RoundPhase.SUMMARY) {
      return MessageType.ARGUMENT;
    }

    // 其他阶段默认使用rebuttal（反驳）
    return MessageType.REBUTTAL;
  }

  /**
   * 添加角色特定指令
   */
  protected addRoleSpecificInstructions(basePrompt: string): string {
    const stance = this.agent.stance;
    const stanceText = stance === AgentStance.PRO ? '正方' : '反方';

    return `${basePrompt}

作为${stanceText}辩手，你需要：

1. **立论阶段**（Round 1-2）：
   - 清晰阐述你方立场
   - 提出2-3个核心论点
   - 为每个论点提供证据支持

2. **反驳阶段**（Round 3-6）：
   - 针对对方论点进行针对性反驳
   - 指出对方逻辑漏洞
   - 巩固己方论点

3. **关键战役**（Round 7-8）：
   - 集中攻击对方核心论点
   - 引入新角度或新证据
   - 强化己方优势

4. **终局攻防**（Round 9）：
   - 总结双方分歧点
   - 最后一次反驳对方
   - 为总结陈词铺垫

5. **总结陈词**（Round 10）：
   - 总结己方核心论点
   - 指出对方主要弱点
   - 强化己方优势

请保持：
- 逻辑清晰，论证严密
- 语言简洁，避免冗余
- 尊重对手，理性辩论
- 每次发言控制在200-400字`;
  }

  /**
   * 获取行动指令
   */
  protected getActionInstruction(): string {
    const stance = this.agent.stance;
    const stanceText = stance === AgentStance.PRO ? '正方' : '反方';

    return `作为${stanceText}辩手，请根据当前辩论状态，发表你的论点或反驳。`;
  }

  /**
   * 构建用户提示词（辩手专用）
   */
  protected buildUserPrompt(context: AgentExecutionContext): string {
    const contextStr = this.buildContextString(context);
    const phase = context.phase;
    const roundNum = context.roundNum;

    let phaseInstruction = '';

    switch (phase) {
      case RoundPhase.OPENING:
        phaseInstruction = `
【立论阶段】
这是第${roundNum}轮，你需要清晰阐述${this.getStanceText()}立场。
请提出2-3个核心论点，每个论点要有具体论据支持。
`;
        break;

      case RoundPhase.REBUTTAL:
        phaseInstruction = `
【反驳阶段】
这是第${roundNum}轮，你需要针对对方的论点进行反驳。
请指出对方论点的漏洞，并用更强的论据支持你的观点。
`;
        break;

      case RoundPhase.CRITICAL:
        phaseInstruction = `
【关键战役】
这是第${roundNum}轮，是辩论的关键时刻。
请集中攻击对方的核心论点，引入新的角度或证据。
`;
        break;

      case RoundPhase.CLOSING:
        phaseInstruction = `
【终局攻防】
这是第${roundNum}轮，即将进入总结。
请总结双方的主要分歧点，进行最后一次反驳。
`;
        break;

      case RoundPhase.SUMMARY:
        phaseInstruction = `
【总结陈词】
这是第${roundNum}轮，也是最后一轮。
请总结你方的核心论点，指出对方的主要弱点。
`;
        break;
    }

    return `辩题：${context.topic}

${phaseInstruction}

${contextStr}

请${this.getActionInstruction()}`;
  }

  /**
   * 获取立场文本
   */
  private getStanceText(): string {
    return this.agent.stance === AgentStance.PRO ? '正方' : '反方';
  }

  /**
   * 验证生成内容的合法性（辩手专用）
   */
  protected validateContent(content: string): boolean {
    // 首先调用基类验证
    if (!super.validateContent(content)) {
      return false;
    }

    // 检查内容长度是否合理（200-800字）
    if (content.length < 50) {
      logger.warn(`${this.id} 生成内容过短`, { length: content.length });
      return false;
    }

    if (content.length > 1500) {
      logger.warn(`${this.id} 生成内容过长`, { length: content.length });
      return false;
    }

    return true;
  }
}

export default DebaterAgent;
