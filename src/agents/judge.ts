import { BaseAgent, AgentResult, AgentExecutionContext } from './base.js';
import { MessageType, VoteStance } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * 评分结果接口
 */
export interface ScoringResult {
  logic: number;
  rebuttal: number;
  clarity: number;
  evidence: number;
  total: number;
  comment: string;
}

/**
 * 裁判Agent类
 * 继承自BaseAgent，实现裁判的评分和评论逻辑
 */
export class JudgeAgent extends BaseAgent {
  /**
   * 执行裁判发言
   */
  async execute(_context: AgentExecutionContext): Promise<AgentResult> {
    // 裁判主要用于评分，不产生普通消息
    // 这里返回一个空的评论消息
    return {
      content: '',
      messageType: MessageType.JUDGE_COMMENT,
    };
  }

  /**
   * 评分单个回合
   * @param proAgentId 正方Agent ID
   * @param conAgentId 反方Agent ID
   * @param context 执行上下文
   */
  async scoreRound(
    proAgentId: string,
    conAgentId: string,
    context: AgentExecutionContext
  ): Promise<{
    proScore: ScoringResult;
    conScore: ScoringResult;
  }> {
    const prompt = this.buildScoringPrompt(proAgentId, conAgentId, context);
    const response = await this.callLLM(prompt);

    // 解析评分结果
    const scores = this.parseScoringResponse(response);

    return scores;
  }

  /**
   * 生成最终裁决
   * @param context 执行上下文
   * @param allScores 所有回合的评分
   */
  async renderFinalJudgment(
    _context: AgentExecutionContext,
    allScores: Array<{
      roundNum: number;
      proScore: ScoringResult;
      conScore: ScoringResult;
    }>
  ): Promise<{
    winner: VoteStance;
    summary: string;
    keyTurningRound?: number;
    blindSpots: {
      pro: string[];
      con: string[];
    };
  }> {
    const prompt = this.buildFinalJudgmentPrompt(_context, allScores);
    const response = await this.callLLM(prompt);

    return this.parseFinalJudgment(response);
  }

  /**
   * 添加角色特定指令
   */
  protected addRoleSpecificInstructions(basePrompt: string): string {
    return `${basePrompt}

作为裁判，你的职责是：

1. **公正评分**：基于客观标准对双方进行评分
2. **识别优劣**：准确识别论点的强弱和漏洞
3. **总结复盘**：在辩论结束时提供全面的分析

评分标准（每项0-10分）：
- **逻辑一致性**：论证是否严密，有无逻辑漏洞
- **针对性反驳**：是否有效回应对方论点
- **表达清晰度**：论述是否清晰易懂
- **论证有效性**：论据是否充分、可信

评分规则：
- 保持客观中立，不偏袒任何一方
- 关注论证质量而非立场本身
- 给出具体的评分理由`;
  }

  /**
   * 获取行动指令
   */
  protected getActionInstruction(): string {
    return '请基于辩论内容进行评分和分析。';
  }

  /**
   * 构建评分提示词
   */
  private buildScoringPrompt(
    proAgentId: string,
    conAgentId: string,
    context: AgentExecutionContext
  ): string {
    // 获取当前回合的消息
    const roundMessages = context.allMessages.filter(
      m => m.round_id === context.roundNum - 1 // round_num是1-based，需要调整
    );

    const proMessages = roundMessages.filter(m => m.agent_id === proAgentId);
    const conMessages = roundMessages.filter(m => m.agent_id === conAgentId);

    return `请对第${context.roundNum}轮辩论进行评分。

辩题：${context.topic}
阶段：${context.phase}

【正方发言】
${proMessages.map(m => m.content).join('\n')}

【反方发言】
${conMessages.map(m => m.content).join('\n')}

请按照以下JSON格式输出评分结果：

\`\`\`json
{
  "pro": {
    "logic": 0-10,
    "rebuttal": 0-10,
    "clarity": 0-10,
    "evidence": 0-10,
    "comment": "评分理由"
  },
  "con": {
    "logic": 0-10,
    "rebuttal": 0-10,
    "clarity": 0-10,
    "evidence": 0-10,
    "comment": "评分理由"
  }
}
\`\`\`

请确保：
1. 每项评分在0-10之间
2. 评分理由简洁明了
3. 保持客观公正`;
  }

  /**
   * 构建最终裁决提示词
   */
  private buildFinalJudgmentPrompt(
    context: AgentExecutionContext,
    allScores: Array<{
      roundNum: number;
      proScore: ScoringResult;
      conScore: ScoringResult;
    }>
  ): string {
    const proTotal = allScores.reduce((sum, s) => sum + s.proScore.total, 0);
    const conTotal = allScores.reduce((sum, s) => sum + s.conScore.total, 0);

    const scoresText = allScores
      .map(
        s => `Round ${s.roundNum}: 正方 ${s.proScore.total}分 | 反方 ${s.conScore.total}分`
      )
      .join('\n');

    return `请对这场辩论进行最终裁决。

辩题：${context.topic}
总轮次：${context.roundNum}

【各轮评分】
${scoresText}

【总分统计】
正方总分：${proTotal}分
反方总分：${conTotal}分

${context.allMessages.map((m, i) => `[R${Math.floor(i / 2) + 1}] ${m.agent_id}: ${m.content}`).join('\n')}

请按照以下JSON格式输出裁决结果：

\`\`\`json
{
  "winner": "pro" | "con" | "draw",
  "summary": "辩论总结（200-300字）",
  "keyTurningRound": 转折回合序号（可选），
  "blindSpots": {
    "pro": ["正方未触及的点1", "正方未触及的点2"],
    "con": ["反方未触及的点1", "反方未触及的点2"]
  }
}
\`\`\`

裁决标准：
- 如果双方总分差距 > 总分的10%，判定高分方胜
- 如果差距 < 10%，判定为平局
- 识别辩论的关键转折点
- 指出双方各自的论点盲点`;
  }

  /**
   * 解析评分响应
   */
  private parseScoringResponse(response: string): {
    proScore: ScoringResult;
    conScore: ScoringResult;
  } {
    try {
      // 尝试提取JSON部分
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) ||
                       response.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('无法找到JSON格式的评分结果');
      }

      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

      const proLogic = this.clampScore(parsed.pro?.logic || 5);
      const proRebuttal = this.clampScore(parsed.pro?.rebuttal || 5);
      const proClarity = this.clampScore(parsed.pro?.clarity || 5);
      const proEvidence = this.clampScore(parsed.pro?.evidence || 5);

      const conLogic = this.clampScore(parsed.con?.logic || 5);
      const conRebuttal = this.clampScore(parsed.con?.rebuttal || 5);
      const conClarity = this.clampScore(parsed.con?.clarity || 5);
      const conEvidence = this.clampScore(parsed.con?.evidence || 5);

      return {
        proScore: {
          logic: proLogic,
          rebuttal: proRebuttal,
          clarity: proClarity,
          evidence: proEvidence,
          total: proLogic + proRebuttal + proClarity + proEvidence,
          comment: parsed.pro?.comment || '',
        },
        conScore: {
          logic: conLogic,
          rebuttal: conRebuttal,
          clarity: conClarity,
          evidence: conEvidence,
          total: conLogic + conRebuttal + conClarity + conEvidence,
          comment: parsed.con?.comment || '',
        },
      };
    } catch (error) {
      logger.warn('解析评分响应失败，使用默认评分', {
        error: (error as Error).message,
      });

      // 返回默认评分
      return {
        proScore: {
          logic: 5,
          rebuttal: 5,
          clarity: 5,
          evidence: 5,
          total: 20,
          comment: '评分解析失败，使用默认值',
        },
        conScore: {
          logic: 5,
          rebuttal: 5,
          clarity: 5,
          evidence: 5,
          total: 20,
          comment: '评分解析失败，使用默认值',
        },
      };
    }
  }

  /**
   * 解析最终裁决响应
   */
  private parseFinalJudgment(response: string): {
    winner: VoteStance;
    summary: string;
    keyTurningRound?: number;
    blindSpots: {
      pro: string[];
      con: string[];
    };
  } {
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) ||
                       response.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('无法找到JSON格式的裁决结果');
      }

      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

      const winnerMap: Record<string, VoteStance> = {
        pro: VoteStance.PRO,
        con: VoteStance.CON,
        draw: VoteStance.DRAW,
      };

      return {
        winner: winnerMap[parsed.winner] || VoteStance.DRAW,
        summary: parsed.summary || '暂无总结',
        keyTurningRound: parsed.keyTurningRound,
        blindSpots: {
          pro: Array.isArray(parsed.blindSpots?.pro) ? parsed.blindSpots.pro : [],
          con: Array.isArray(parsed.blindSpots?.con) ? parsed.blindSpots.con : [],
        },
      };
    } catch (error) {
      logger.warn('解析裁决响应失败，使用默认值', {
        error: (error as Error).message,
      });

      return {
        winner: VoteStance.DRAW,
        summary: '裁决解析失败',
        blindSpots: { pro: [], con: [] },
      };
    }
  }

  /**
   * 限制分数在0-10范围内
   */
  private clampScore(value: number): number {
    return Math.max(0, Math.min(10, Math.round(value)));
  }

  /**
   * 验证生成内容的合法性（裁判专用）
   */
  protected validateContent(): boolean {
    // 裁判主要通过评分输出，内容可以为空
    return true;
  }
}

export default JudgeAgent;
