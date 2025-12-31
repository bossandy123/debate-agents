/**
 * Score 数据模型和类型定义
 * 代表裁判 Agent 在某一轮对某个 Agent 的评分
 */

/**
 * 单个维度的评分
 */
export interface ScoreDimensions {
  logic: number; // 逻辑一致性 (0-10)
  rebuttal: number; // 针对性反驳 (0-10)
  clarity: number; // 表达清晰度 (0-10)
  evidence: number; // 论证有效性 (0-10)
}

/**
 * Score 实体
 */
export interface Score extends ScoreDimensions {
  round_id: number;
  agent_id: string;
  comment?: string;
}

/**
 * 创建评分输入
 */
export interface CreateScoreInput {
  round_id: number;
  agent_id: string;
  logic: number;
  rebuttal: number;
  clarity: number;
  evidence: number;
  comment?: string;
}

/**
 * 评分汇总（用于计算总分）
 */
export interface ScoreSummary extends ScoreDimensions {
  total: number; // 总分
}

/**
 * 双方评分对比
 */
export interface PairScores {
  pro: ScoreSummary;
  con: ScoreSummary;
}

/**
 * 计算评分总分
 */
export function calculateTotal(score: ScoreDimensions): number {
  return score.logic + score.rebuttal + score.clarity + score.evidence;
}

/**
 * 计算平均分
 */
export function calculateAverage(score: ScoreDimensions): number {
  return calculateTotal(score) / 4;
}

/**
 * 验证评分维度
 */
export function validateScore(
  logic: number,
  rebuttal: number,
  clarity: number,
  evidence: number
): string[] {
  const errors: string[] = [];

  const dimensions = [
    { name: "逻辑一致性", value: logic },
    { name: "针对性反驳", value: rebuttal },
    { name: "表达清晰度", value: clarity },
    { name: "论证有效性", value: evidence },
  ];

  for (const dim of dimensions) {
    if (dim.value < 0 || dim.value > 10) {
      errors.push(`${dim.name}必须在0-10之间`);
    }
    if (!Number.isInteger(dim.value * 10)) {
      errors.push(`${dim.name}最多保留1位小数`);
    }
  }

  return errors;
}
