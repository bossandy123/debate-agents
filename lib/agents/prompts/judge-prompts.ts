/**
 * Judge Prompt Templates
 * Prompt templates for judge scoring and moderation
 */

import { PromptTemplate } from "@langchain/core/prompts";

/**
 * 评审维度
 */
export const SCORING_DIMENSIONS = {
  logic: "逻辑性 - 论点是否清晰、推理是否严密、论据之间的逻辑关系是否连贯",
  rebuttal: "反驳能力 - 是否有效回应对方观点、指出对方漏洞的能力",
  clarity: "清晰度 - 表达是否清晰、有条理、易于理解",
  evidence: "论据充分性 - 是否有充分的事实、数据或例证支持观点",
};

/**
 * 裁判评分提示模板（用于生成结构化的JSON评分）
 */
export const JUDGE_SCORING_TEMPLATE = `你是一名公正、专业的辩论裁判。请对以下辩论发言进行评分。

**辩题：** {topic}

**当前轮次：** {round_number} / {max_rounds}

**发言者：** {agent_stance}

**发言内容：**
{agent_content}

**评分标准（每项1-10分）：**
1. 逻辑性：{logic_desc}
2. 反驳能力：{rebuttal_desc}
3. 清晰度：{clarity_desc}
4. 论据充分性：{evidence_desc}

**要求：**
1. 请根据上述标准对发言进行客观评分
2. 每项评分在1-10分之间（整数）
3. 给出简短的评语（50字以内）说明评分理由
4. 检测是否有犯规行为（如人身攻击、无关发言等）

**输出格式（必须是有效的JSON）：**
\`\`\`json
{{
  "logic": 7,
  "rebuttal": 6,
  "clarity": 8,
  "evidence": 5,
  "comment": "论点较为清晰，但在反驳环节稍显薄弱",
  "fouls": []
}}
\`\`\`

说明：logic/rebuttal/clarity/evidence 为1-10的整数，comment为评语字符串，fouls为犯规数组（可选值："ad_hominem", "off_topic", "disruption", "other"）。

**你的评分：**`;

/**
 * 裁判发言引导提示（用于开场或总结时的发言）
 */
export const JUDGE_SPEAKING_TEMPLATE = `你是一名公正、专业的辩论裁判。

**辩题：** {topic}

**当前轮次：** {round_number} / {max_rounds}
**辩论阶段：** {phase_name}

**上一轮情况：**
{previous_round_summary}

**你的任务：**
{phase_instruction}

**要求：**
1. 保持中立、客观的立场
2. 发言简洁明了（100字以内）
3. 在反驳阶段可以简要指出双方需要改进的方面
4. 不要对双方观点表示偏向

**你的发言：**`;

/**
 * 裁判犯规检测提示
 */
export const JUDGE_FOUL_DETECTION_TEMPLATE = `你是一名辩论裁判，负责检测辩论中的犯规行为。

**发言者：** {agent_stance}
**发言内容：**
{agent_content}

**犯规类型定义：**
1. 人身攻击（ad_hominem）- 针对对方个人而非观点的攻击
2. 偏离主题（off_topic）- 发言与辩题无关
3. 干扰秩序（disruption）- 故意干扰辩论正常进行
4. 其他（other）- 其他违反辩论规则的行为

**输出格式（JSON）：**
\`\`\`json
{
  "has_foul": <true或false>,
  "foul_type": "<犯规类型，如无则为null>",
  "reason": "<犯规原因，如无则为null>"
}
\`\`\`

**你的判断：**`;

/**
 * 裁判阶段指令映射
 */
const PHASE_INSTRUCTIONS: Record<string, string> = {
  opening: "请宣布立论阶段开始，简要介绍本阶段要求。",
  rebuttal: "请引导双方进入反驳与论证阶段。",
  closing: "请宣布进入总结陈词阶段，这是最后发言机会。",
};

/**
 * 创建裁判评分 Prompt Template
 */
export function createJudgeScoringPrompt(): PromptTemplate {
  return new PromptTemplate({
    template: JUDGE_SCORING_TEMPLATE,
    inputVariables: [
      "topic",
      "round_number",
      "max_rounds",
      "agent_stance",
      "agent_content",
      "logic_desc",
      "rebuttal_desc",
      "clarity_desc",
      "evidence_desc",
    ],
  });
}

/**
 * 创建裁判发言 Prompt Template
 */
export function createJudgeSpeakingPrompt(phase: "opening" | "rebuttal" | "closing"): PromptTemplate {
  const phaseNames = {
    opening: "立论阶段",
    rebuttal: "反驳与论证阶段",
    closing: "总结陈词阶段",
  };

  return new PromptTemplate({
    template: JUDGE_SPEAKING_TEMPLATE,
    inputVariables: ["topic", "round_number", "max_rounds", "previous_round_summary"],
    partialVariables: {
      phase_name: phaseNames[phase],
      phase_instruction: PHASE_INSTRUCTIONS[phase],
    },
  });
}

/**
 * 创建犯规检测 Prompt Template
 */
export function createFoulDetectionPrompt(): PromptTemplate {
  return new PromptTemplate({
    template: JUDGE_FOUL_DETECTION_TEMPLATE,
    inputVariables: ["agent_stance", "agent_content"],
  });
}

/**
 * 裁判审批观众申请发言提示模板
 */
export const JUDGE_AUDIENCE_APPROVAL_TEMPLATE = `你是一名辩论裁判，负责审批观众 Agent 的下场发言申请。

**辩题：** {topic}

**当前轮次：** {round_number} / {max_rounds}

**观众申请信息：**
- 申请 ID: {request_id}
- 观众类型: {audience_type}
- 支持立场: {intent}
- 核心观点: {claim}
- 新颖性: {novelty}
- 置信度: {confidence}

**本轮辩论情况：**
{round_context}

**审批标准：**
1. **相关性**：观点是否与当前辩论话题相关
2. **新颖性**：是否提供新视角或强化了现有论点
3. **价值性**：是否能促进辩论质量
4. **时机性**：当前是否适合插入观众发言

**要求：**
- 如果批准，给出简短的理由（20字以内）
- 如果拒绝，说明原因（如：与话题无关、观点重复、时机不当等）

**输出格式（必须是有效的JSON）：**
\`\`\`json
{{
  "approved": true,
  "comment": "观点新颖，能够促进辩论质量"
}}
\`\`\`

说明：approved为布尔值（true表示批准，false表示拒绝），comment为审批理由或拒绝原因字符串。

**你的审批决定：**`;

/**
 * 创建观众申请审批 Prompt Template
 */
export function createAudienceApprovalPrompt(): PromptTemplate {
  return new PromptTemplate({
    template: JUDGE_AUDIENCE_APPROVAL_TEMPLATE,
    inputVariables: [
      "topic",
      "round_number",
      "max_rounds",
      "request_id",
      "audience_type",
      "intent",
      "claim",
      "novelty",
      "confidence",
      "round_context",
    ],
  });
}

/**
 * 格式化上一轮摘要
 */
export function formatPreviousRoundSummary(
  proScore?: { total: number },
  conScore?: { total: number }
): string {
  if (!proScore || !conScore) {
    return "（这是第一轮，暂无评分）";
  }

  return `当前比分 - 正方：${proScore.total}分，反方：${conScore.total}分`;
}
