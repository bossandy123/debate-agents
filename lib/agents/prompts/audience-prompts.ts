/**
 * Audience Prompt Templates
 * Prompt templates for audience agents
 */

import { PromptTemplate } from "@langchain/core/prompts";

/**
 * 观众类型描述
 */
const AUDIENCE_TYPE_DESCRIPTIONS: Record<string, string> = {
  rational: "理性逻辑派 - 你注重逻辑推理和论证的严密性，偏好清晰、有条理的论点。",
  pragmatic: "现实可行性派 - 你关注观点的实际可行性和现实意义，重视实施难度和成本效益。",
  technical: "技术专业派 - 你从专业技术角度评估观点，重视技术细节和科学依据。",
  "risk_averse": "风险厌恶派 - 你对观点可能带来的风险敏感，关注潜在问题和负面影响。",
  emotional: "情感共鸣派 - 你容易被富有感染力的表达打动，重视情感共鸣和价值认同。",
};

/**
 * 观众投票提示模板（用于辩论结束时投票）
 */
export const AUDIENCE_VOTING_TEMPLATE = `你是一名辩论观众，刚刚观看了一场关于"{topic}"的辩论。

**你的观点倾向：** {audience_type}

**正方立场：** {pro_definition}
**反方立场：** {con_definition}

**正方主要论点：**
{pro_arguments}

**反方主要论点：**
{con_arguments}

**评分总结：**
正方总分：{pro_total_score}分
反方总分：{con_total_score}分

**你的任务：**
1. 根据你的观点倾向，判断哪一方更有说服力
2. 结合双方的论点和表现做出选择
3. 给出简短的理由（30字以内）

**输出格式（必须是有效的JSON）：**
\`\`\`json
{{
  "vote": "pro",
  "reason": "正方论点更加符合逻辑，证据更充分"
}}
\`\`\`

说明：vote为"pro"、"con"或"draw"（三选一），reason为投票理由字符串。

**你的投票：**`;

/**
 * 观众申请发言提示模板（用于辩论过程中申请参与）
 */
export const AUDIENCE_REQUEST_TEMPLATE = `你是一名辩论观众，正在观看一场关于"{topic}"的辩论。

**你的观点倾向：** {audience_type}

**当前辩论状态：**
- 当前轮次：{round_number} / {max_rounds}
- 正方立场：{pro_definition}
- 反方立场：{con_definition}

**最近的对话：**
{recent_conversation}

**你的任务：**
1. 判断是否需要向辩手提问或发表你的观点
2. 如果你想参与，请提出一个有价值的问题或观点（50字以内）
3. 如果没有想说的，可以保持沉默

**注意：**
- 观众发言是可选的，不是必须的
- 你的问题或观点应该与辩题相关
- 避免重复已经讨论过的内容

**输出格式（必须是有效的JSON）：**
\`\`\`json
{{
  "wants_to_speak": true,
  "content": "请问双方对于金钱在现代社会中的作用有何不同看法？"
}}
\`\`\`

说明：wants_to_speak 为布尔值（true表示想发言，false表示不想发言），content为想说的内容（如果wants_to_speak为false则填空字符串）。

**你的选择：**`;

/**
 * 观众反馈提示模板（用于辩论结束后提供反馈）
 */
export const AUDIENCE_FEEDBACK_TEMPLATE = `你是一名辩论观众，刚刚观看了一场关于"{topic}"的辩论。

**你的观点倾向：** {audience_type}

**辩论结果：**
{debate_result}

**你的任务：**
1. 对这场辩论进行简短评价
2. 指出你认为双方表现最好的地方
3. 提出改进建议（可选）

**要求：**
- 评价简洁中肯（100字以内）
- 建设性反馈为主

**你的反馈：**`;

/**
 * 创建观众投票 Prompt Template
 */
export function createAudienceVotingPrompt(audienceType: string): PromptTemplate {
  const typeDesc =
    AUDIENCE_TYPE_DESCRIPTIONS[audienceType] ||
    AUDIENCE_TYPE_DESCRIPTIONS.rational;

  return new PromptTemplate({
    template: AUDIENCE_VOTING_TEMPLATE,
    inputVariables: [
      "topic",
      "pro_definition",
      "con_definition",
      "pro_arguments",
      "con_arguments",
      "pro_total_score",
      "con_total_score",
    ],
    partialVariables: {
      audience_type: typeDesc,
    },
  });
}

/**
 * 创建观众申请发言 Prompt Template
 */
export function createAudienceRequestPrompt(audienceType: string): PromptTemplate {
  const typeDesc =
    AUDIENCE_TYPE_DESCRIPTIONS[audienceType] ||
    AUDIENCE_TYPE_DESCRIPTIONS.rational;

  return new PromptTemplate({
    template: AUDIENCE_REQUEST_TEMPLATE,
    inputVariables: [
      "topic",
      "round_number",
      "max_rounds",
      "pro_definition",
      "con_definition",
      "recent_conversation",
    ],
    partialVariables: {
      audience_type: typeDesc,
    },
  });
}

/**
 * 创建观众反馈 Prompt Template
 */
export function createAudienceFeedbackPrompt(audienceType: string): PromptTemplate {
  const typeDesc =
    AUDIENCE_TYPE_DESCRIPTIONS[audienceType] ||
    AUDIENCE_TYPE_DESCRIPTIONS.rational;

  return new PromptTemplate({
    template: AUDIENCE_FEEDBACK_TEMPLATE,
    inputVariables: ["topic", "debate_result"],
    partialVariables: {
      audience_type: typeDesc,
    },
  });
}

/**
 * 格式化双方论点摘要
 */
export function formatArgumentsSummary(
  messages: Array<{ stance: string; content: string }>
): {
  pro: string;
  con: string;
} {
  const proMessages = messages
    .filter((m) => m.stance === "pro")
    .map((m) => m.content)
    .join("\n");

  const conMessages = messages
    .filter((m) => m.stance === "con")
    .map((m) => m.content)
    .join("\n");

  return {
    pro: proMessages || "（正方暂无发言）",
    con: conMessages || "（反方暂无发言）",
  };
}

/**
 * 格式化辩论结果
 */
export function formatDebateResult(
  winner: "pro" | "con" | "tie",
  proScore: number,
  conScore: number
): string {
  const winnerName =
    winner === "pro"
      ? "正方获胜"
      : winner === "con"
        ? "反方获胜"
        : "平局";

  return `获胜方：${winnerName}
正方总分：${proScore}分
反方总分：${conScore}分`;
}
