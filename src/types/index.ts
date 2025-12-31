/**
 * Agent配置接口
 */
export interface AgentConfig {
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * 辩论状态枚举
 */
export enum DebateStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * 回合状态枚举
 */
export enum RoundStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

/**
 * 回合阶段枚举
 */
export enum RoundPhase {
  OPENING = 'opening',           // Round 1-2: 立场构建
  REBUTTAL = 'rebuttal',         // Round 3-6: 对抗与拉盟友
  CRITICAL = 'critical',         // Round 7-8: 关键战役
  CLOSING = 'closing',           // Round 9: 终局攻防
  SUMMARY = 'summary',           // Round 10: 总结陈词
}

/**
 * Agent角色枚举
 */
export enum AgentRole {
  DEBATER = 'debater',
  JUDGE = 'judge',
  AUDIENCE = 'audience',
}

/**
 * Agent立场枚举
 */
export enum AgentStance {
  PRO = 'pro',
  CON = 'con',
}

/**
 * 观众风格枚举
 */
export enum AudienceStyle {
  RATIONAL = 'rational',           // 理性逻辑派
  PRACTICAL = 'conservative',      // 现实可行性派
  TECHNICAL = 'technical',        // 技术前瞻派
  RISK_AVERSE = 'aggressive',     // 风险厌恶派
  EMOTIONAL = 'emotional',        // 情绪共鸣派
}

/**
 * LLM提供商枚举
 */
export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE_GENAI = 'google_genai',
  DEEPSEEK = 'deepseek',
}

/**
 * 消息类型枚举
 */
export enum MessageType {
  ARGUMENT = 'argument',
  REBUTTAL = 'rebuttal',
  JUDGE_COMMENT = 'judge_comment',
  AUDIENCE_SUPPORT = 'audience_support',
  HELP_REQUEST = 'help_request',
}

/**
 * 观众申请状态枚举
 */
export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  GRANTED = 'granted',
  DENIED = 'denied',
}

/**
 * 观众申请意图枚举
 */
export enum AudienceIntent {
  SUPPORT_PRO = 'support_pro',
  SUPPORT_CON = 'support_con',
}

/**
 * 求援请求类型枚举
 */
export enum HelpRequestType {
  TECHNICAL = 'technical',
  ETHICAL = 'ethical',
  PRACTICAL = 'practical',
}

/**
 * 投票立场枚举
 */
export enum VoteStance {
  PRO = 'pro',
  CON = 'con',
  DRAW = 'draw',
}

/**
 * 辩论会话接口
 */
export interface Debate {
  id: number;
  topic: string;
  status: DebateStatus;
  created_at: string;
  completed_at?: string;
  winner?: VoteStance;
  error_message?: string;
}

/**
 * Agent接口
 */
export interface Agent {
  id: string;
  debate_id: number;
  role: AgentRole;
  provider: LLMProvider;
  model: string;
  stance?: AgentStance;
  style_tag?: AudienceStyle;
  config: AgentConfig;
}

/**
 * 回合接口
 */
export interface Round {
  id: number;
  debate_id: number;
  round_num: number;
  phase: RoundPhase;
  status: RoundStatus;
  started_at?: string;
  completed_at?: string;
}

/**
 * 消息接口
 */
export interface Message {
  id: number;
  round_id: number;
  agent_id: string;
  content: string;
  message_type: MessageType;
  created_at: string;
}

/**
 * 评分接口
 */
export interface Score {
  id: number;
  round_id: number;
  agent_id: string;
  logic: number;
  rebuttal: number;
  clarity: number;
  evidence: number;
  total: number;
  comment?: string;
}

/**
 * 观众下场申请接口
 */
export interface AudienceRequest {
  id: number;
  round_id: number;
  agent_id: string;
  intent: AudienceIntent;
  claim: string;
  novelty: 'new' | 'reinforcement';
  confidence: number;
  status: RequestStatus;
  judge_comment?: string;
}

/**
 * 求援请求接口
 */
export interface HelpRequest {
  id: number;
  round_id: number;
  agent_id: string;
  request_type: HelpRequestType;
  target_audience: string;
  reason: string;
  status: RequestStatus;
}

/**
 * 投票接口
 */
export interface AudienceVote {
  id: number;
  debate_id: number;
  audience_id: string;
  vote: VoteStance;
  confidence: number;
  reason?: string;
  voted_at: string;
}

/**
 * 辩论结果接口
 */
export interface DebateResult {
  debate: Debate;
  winner: VoteStance;
  final_scores: {
    pro: number;
    con: number;
  };
  key_turning_round?: number;
  blind_spots: {
    pro: string[];
    con: string[];
  };
  audience_votes: Array<{
    agent_id: string;
    vote: VoteStance;
    confidence: number;
    reason?: string;
  }>;
  judge_summary: string;
}

/**
 * 创建辩论请求接口
 */
export interface CreateDebateRequest {
  topic: string;
  pro_model: string;
  con_model: string;
  audience_count?: number;
  max_rounds?: number;
}

/**
 * 辩论状态响应接口
 */
export interface DebateStatusResponse {
  debate_id: number;
  status: DebateStatus;
  current_round?: number;
  progress: number;
}

/**
 * API错误响应接口
 */
export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}
