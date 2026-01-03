/**
 * 情绪分析 Prompt 模板
 * Feature: 001-voice-emotion
 *
 * 用于 LLM 分析文本中的情绪，并生成 TTS 参数
 */

export interface EmotionAnalysisPromptOptions {
  text: string;
  debateRole?: 'pro' | 'con' | 'judge' | 'audience';
  roundPhase?: 'opening' | 'rebuttal' | 'closing';
  context?: string;
}

/**
 * 构建情绪分析 Prompt
 */
export function buildEmotionAnalysisPrompt(options: EmotionAnalysisPromptOptions): string {
  const { text, debateRole, roundPhase, context } = options;

  // 截断文本以避免超过 token 限制（保留前 2000 字符用于分析）
  const truncatedText = text.length > 2000 ? text.substring(0, 2000) + '...' : text;

  return `你是一个专业的语音情绪分析师。你的任务是分析辩论发言中的情绪，并生成适合 TTS（文本转语音）的参数。

## 输入信息

**发言内容**:
"""
${truncatedText}
"""

${debateRole ? `**辩论角色**: ${getRoleLabel(debateRole)}` : ''}
${roundPhase ? `**辩论阶段**: ${getPhaseLabel(roundPhase)}` : ''}
${context ? `**上下文**: ${context}` : ''}

## 任务

请分析这段发言的情绪，并以 JSON 格式返回以下信息：

1. **emotionType** (string): 情绪类型，必须是以下之一：
   - "intense": 激烈、激昂、愤怒、强调（语调高、语速快、音量大）
   - "neutral": 中立、理性、平静（正常语调、语速、音量）
   - "calm": 从容、温和、不确定（语调低、语速慢、音量适中）

2. **emotionIntensity** (number): 情绪强度，范围 0.0 - 1.0
   - 0.0: 几乎没有情绪
   - 0.5: 中等情绪
   - 1.0: 极强情绪

3. **pitchShift** (number): 音高调整，范围 0.5 - 2.0
   - 1.0: 正常音高
   - > 1.0: 较高音高（女性化、激昂）
   - < 1.0: 较低音高（男性化、严肃）

4. **speedMultiplier** (number): 语速调整，范围 0.5 - 2.0
   - 1.0: 正常语速
   - > 1.0: 较快语速（激动、紧张）
   - < 1.0: 较慢语速（犹豫、强调）

5. **volumeBoost** (number): 音量调整，范围 0.0 - 2.0
   - 1.0: 正常音量
   - > 1.0: 较大声（强调、愤怒）
   - < 1.0: 较小声（犹豫、不确定）

6. **reasoning** (string): 简短说明你的判断依据（不超过 100 字）

7. **confidence** (number): 判断置信度，范围 0.0 - 1.0

## 分析指南

### 情绪类型判断

**intense** 的特征：
- 包含反驳、质疑、批评的词语
- 使用感叹号、问号较多
- 包含强调性词汇（"显然"、"毫无疑问"、"必须"等）
- 语气强烈、观点鲜明

**neutral** 的特征：
- 事实陈述、逻辑推演
- 使用说明性、分析性语言
- 语气平和、客观中立

**calm** 的特征：
- 总结性、概括性语言
- 犹豫、不确定的表达
- 温和的建议或提醒

### 参数调整建议

**激烈反驳 (intense)**:
- pitchShift: 1.1 - 1.3
- speedMultiplier: 1.2 - 1.5
- volumeBoost: 1.2 - 1.5

**理性分析 (neutral)**:
- pitchShift: 0.9 - 1.1
- speedMultiplier: 0.9 - 1.1
- volumeBoost: 0.9 - 1.1

**从容总结 (calm)**:
- pitchShift: 0.8 - 0.95
- speedMultiplier: 0.8 - 0.95
- volumeBoost: 0.9 - 1.0

## 输出格式

请直接返回 JSON 对象，不要包含任何其他文字：

\`\`\`json
{
  "emotionType": "intense|neutral|calm",
  "emotionIntensity": 0.0-1.0,
  "pitchShift": 0.5-2.0,
  "speedMultiplier": 0.5-2.0,
  "volumeBoost": 0.0-2.0,
  "reasoning": "简短说明",
  "confidence": 0.0-1.0
}
\`\`\``;
}

/**
 * 获取角色标签
 */
function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    pro: '正方辩手',
    con: '反方辩手',
    judge: '评委',
    audience: '观众',
  };
  return labels[role] || role;
}

/**
 * 获取阶段标签
 */
function getPhaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    opening: '开篇陈词',
    rebuttal: '反驳阶段',
    closing: '总结陈词',
  };
  return labels[phase] || phase;
}

/**
 * 默认的情绪分析结果（当分析失败时使用）
 */
export const DEFAULT_EMOTION_RESULT = {
  emotionType: 'neutral' as const,
  emotionIntensity: 0.5,
  pitchShift: 1.0,
  speedMultiplier: 1.0,
  volumeBoost: 1.0,
  reasoning: '使用默认情绪参数',
  confidence: 0.5,
};
