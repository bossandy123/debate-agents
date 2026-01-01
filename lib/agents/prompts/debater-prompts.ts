/**
 * Debater Prompt Templates
 * Prompt templates for pro and con debaters
 */

import { PromptTemplate } from "@langchain/core/prompts";

/**
 * 辩论阶段类型
 */
export type DebatePhase = "opening" | "rebuttal" | "closing";

/**
 * 获取辩论阶段名称（中文）
 */
function getPhaseName(phase: DebatePhase): string {
  switch (phase) {
    case "opening":
      return "立论阶段";
    case "rebuttal":
      return "反驳与论证阶段";
    case "closing":
      return "总结陈词阶段";
  }
}

/**
 * 获取辩论阶段指导（中文）
 */
function getPhaseGuidance(phase: DebatePhase, stance: "pro" | "con"): string {
  const stanceName = stance === "pro" ? "正方" : "反方";

  switch (phase) {
    case "opening":
      return `作为${stanceName}辩手，这是立论阶段。请清晰地阐述你的核心观点，提出2-3个主要论点来支持你的立场。每个论点应该有逻辑支撑和具体例证。`;

    case "rebuttal":
      return `作为${stanceName}辩手，这是反驳与论证阶段。请：
1. 针对对方的观点进行有理有据的反驳
2. 加强和扩展你自己的论点
3. 可以引用对方之前的发言来支持你的反驳
4. 避免重复之前已经说过的内容`;

    case "closing":
      return `作为${stanceName}辩手，这是总结陈词阶段。请：
1. 总结你的核心论点
2. 强调你的优势论据
3. 回应对方最有力的攻击
4. 给出令人信服的最终陈述`;
  }
}

/**
 * 辩手基础提示模板
 */
const DEBATER_BASE_TEMPLATE = `你是一名专业的辩手，正在参与一场关于"{topic}"的辩论。

{stance_definition}

**当前信息：**
- 辩题：{topic}
- 你的立场：{stance}
- 当前轮次：{current_round} / {max_rounds}
- 辩论阶段：{phase_name}

**立场定义：**
{pro_con_definitions}

**历史对话记录：**
{conversation_history}

**阶段指导：**
{phase_guidance}

**你的风格：** {style_description}

**要求：**
1. 保持专业、理性的辩论风格
2. 你的发言应该简洁有力，控制在200-300字之间
3. 必须紧扣辩题和你的立场
4. 引用具体的事实、数据或逻辑来支持你的观点
5. 不要重复之前已经说过的论点

**你的发言：**`;

/**
 * 风格描述映射
 */
const STYLE_DESCRIPTIONS: Record<string, string> = {
  rational: "理性逻辑派 - 你善于使用严密的逻辑推理，注重论据之间的因果关系，避免情绪化的表达。",
  aggressive: "激进攻击派 - 你善于直接指出对方观点的漏洞，使用强烈的对比和反问来加强说服力。",
  conservative: "保守防御派 - 你擅长稳固地防守己方立场，以守为攻，稳健地应对对方的攻击。",
  technical: "技术专业派 - 你倾向于使用专业术语、技术数据和具体案例来支持你的论点。",
};

/**
 * 立场描述映射
 */
const STANCE_DESCRIPTIONS: Record<string, string> = {
  pro: "你是正方，支持这个辩题。",
  con: "你是反方，反对这个辩题。",
};

/**
 * 创建辩手 Prompt Template
 */
export function createDebaterPromptTemplate(
  stance: "pro" | "con",
  phase: DebatePhase,
  styleTag?: string
): PromptTemplate {
  const stanceName = stance === "pro" ? "正方" : "反方";
  const phaseName = getPhaseName(phase);
  const phaseGuidance = getPhaseGuidance(phase, stance);
  const styleDescription = styleTag
    ? STYLE_DESCRIPTIONS[styleTag] || STYLE_DESCRIPTIONS.rational
    : STYLE_DESCRIPTIONS.rational;

  return new PromptTemplate({
    template: DEBATER_BASE_TEMPLATE,
    inputVariables: [
      "topic",
      "pro_definition",
      "con_definition",
      "current_round",
      "max_rounds",
      "conversation_history",
    ],
    partialVariables: {
      stance: stanceName,
      stance_definition: STANCE_DESCRIPTIONS[stance],
      phase_name: phaseName,
      phase_guidance: phaseGuidance,
      style_description: styleDescription,
      pro_con_definitions: `正方观点：{pro_definition}\n反方观点：{con_definition}`,
    },
  });
}

/**
 * 获取立论阶段模板（第1-2轮）
 */
export function getOpeningPromptTemplate(
  stance: "pro" | "con",
  styleTag?: string
): PromptTemplate {
  return createDebaterPromptTemplate(stance, "opening", styleTag);
}

/**
 * 获取反驳阶段模板（第3-9轮）
 */
export function getRebuttalPromptTemplate(
  stance: "pro" | "con",
  styleTag?: string
): PromptTemplate {
  return createDebaterPromptTemplate(stance, "rebuttal", styleTag);
}

/**
 * 获取总结陈词模板（第10轮）
 */
export function getClosingPromptTemplate(
  stance: "pro" | "con",
  styleTag?: string
): PromptTemplate {
  return createDebaterPromptTemplate(stance, "closing", styleTag);
}

/**
 * 根据轮次获取对应的 Prompt Template
 */
export function getDebaterPromptByRound(
  stance: "pro" | "con",
  roundNumber: number,
  maxRounds: number,
  styleTag?: string
): PromptTemplate {
  if (roundNumber <= 2) {
    return getOpeningPromptTemplate(stance, styleTag);
  } else if (roundNumber < maxRounds) {
    return getRebuttalPromptTemplate(stance, styleTag);
  } else {
    return getClosingPromptTemplate(stance, styleTag);
  }
}

/**
 * 格式化对话历史为 Prompt
 */
export function formatConversationHistory(
  messages: Array<{ role: string; stance?: string; content: string }>
): string {
  if (messages.length === 0) {
    return "（这是第一轮发言，还没有历史记录）";
  }

  return messages
    .map((msg) => {
      const prefix = msg.stance
        ? `${msg.stance.toUpperCase()}`
        : msg.role.toUpperCase();
      return `[${prefix}]: ${msg.content}`;
    })
    .join("\n\n");
}
