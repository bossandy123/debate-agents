/**
 * 情绪分析器
 * Feature: 001-voice-emotion
 *
 * 使用 LLM 分析文本情绪，生成 TTS 参数
 */

import { buildEmotionAnalysisPrompt, DEFAULT_EMOTION_RESULT } from './prompts';
import { EmotionAnalysisResult } from '../types';

export interface EmotionAnalysisOptions {
  text: string;
  debateRole?: 'pro' | 'con' | 'judge' | 'audience';
  roundPhase?: 'opening' | 'rebuttal' | 'closing';
  context?: string;
  model?: string;
}

export interface EmotionAnalysisResultWithModel extends EmotionAnalysisResult {
  modelUsed: string;
}

/**
 * 情绪分析器
 */
export class EmotionAnalyzer {
  private defaultModel: string;

  constructor(defaultModel: string = 'gpt-4o-mini') {
    this.defaultModel = defaultModel;
  }

  /**
   * 分析文本情绪
   */
  async analyze(options: EmotionAnalysisOptions): Promise<EmotionAnalysisResultWithModel> {
    const { text, debateRole, roundPhase, context, model = this.defaultModel } = options;

    // 如果文本太短，直接返回默认值
    if (text.trim().length < 10) {
      return {
        ...DEFAULT_EMOTION_RESULT,
        reasoning: '文本过短，使用默认情绪',
        modelUsed: model,
      };
    }

    try {
      const prompt = buildEmotionAnalysisPrompt({
        text,
        debateRole,
        roundPhase,
        context,
      });

      const result = await this.callLLM(prompt, model);
      return {
        ...result,
        modelUsed: model,
      };
    } catch (error) {
      console.error('[EmotionAnalyzer] Analysis failed:', error);

      // 失败时返回默认值
      return {
        ...DEFAULT_EMOTION_RESULT,
        reasoning: `分析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        confidence: 0.0,
        modelUsed: model,
      };
    }
  }

  /**
   * 批量分析（并行处理）
   */
  async analyzeBatch(
    items: EmotionAnalysisOptions[]
  ): Promise<EmotionAnalysisResultWithModel[]> {
    // 并行分析，但限制并发数为 3
    const concurrency = 3;
    const results: EmotionAnalysisResultWithModel[] = [];

    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(item => this.analyze(item))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 调用 LLM API
   */
  private async callLLM(
    _prompt: string,
    _model: string
  ): Promise<Omit<EmotionAnalysisResult, 'modelUsed'>> {
    // 这里需要调用实际的 LLM API
    // 暂时使用简单的规则分析作为 fallback

    // TODO: 集成实际的 LLM API (OpenAI / Anthropic / etc.)
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    //   },
    //   body: JSON.stringify({
    //     model: _model,
    //     messages: [{ role: 'user', content: _prompt }],
    //     temperature: 0.3,
    //     response_format: { type: 'json_object' },
    //   }),
    // });
    // const data = await response.json();
    // const result = JSON.parse(data.choices[0].message.content);

    // 临时使用规则分析
    return this.ruleBasedAnalysis(_prompt);
  }

  /**
   * 基于规则的情绪分析（临时方案）
   */
  private ruleBasedAnalysis(prompt: string): Omit<EmotionAnalysisResult, 'modelUsed'> {
    // 提取发言内容（从 prompt 中）
    const textMatch = prompt.match(/\*\*发言内容\*\*:\s*"""\s*(.+?)\s*"""/s);
    const text = textMatch ? textMatch[1] : '';

    // 检测关键词
    const intenseKeywords = [
      '显然', '毫无疑问', '必须', '绝对', '错误', '荒谬',
      '反对', '驳斥', '质疑', '可笑', '荒唐', '!',
    ];
    const calmKeywords = [
      '总结', '概括', '总的来说', '综上所述', '或许',
      '可能', '也许', '建议', '提醒',
    ];

    let emotionType: 'intense' | 'neutral' | 'calm' = 'neutral';
    let emotionIntensity = 0.5;

    // 检测激烈情绪
    const intenseCount = intenseKeywords.filter(kw => text.includes(kw)).length;
    const exclamationCount = (text.match(/!/g) || []).length;
    // const questionCount = (text.match(/\?/g) || []).length; // 预留用于未来分析

    if (intenseCount > 2 || exclamationCount > 2) {
      emotionType = 'intense';
      emotionIntensity = Math.min(1.0, 0.5 + intenseCount * 0.1 + exclamationCount * 0.05);
    }

    // 检测冷静情绪
    const calmCount = calmKeywords.filter(kw => text.includes(kw)).length;
    if (calmCount > 2 && emotionType === 'neutral') {
      emotionType = 'calm';
      emotionIntensity = Math.min(1.0, 0.5 + calmCount * 0.1);
    }

    // 根据 emotionType 生成参数
    let pitchShift = 1.0;
    let speedMultiplier = 1.0;
    let volumeBoost = 1.0;

    switch (emotionType) {
      case 'intense':
        pitchShift = 1.0 + Math.random() * 0.3; // 1.0 - 1.3
        speedMultiplier = 1.0 + Math.random() * 0.4; // 1.0 - 1.4
        volumeBoost = 1.0 + Math.random() * 0.4; // 1.0 - 1.4
        break;

      case 'calm':
        pitchShift = 0.85 + Math.random() * 0.1; // 0.85 - 0.95
        speedMultiplier = 0.85 + Math.random() * 0.1; // 0.85 - 0.95
        volumeBoost = 0.9 + Math.random() * 0.1; // 0.9 - 1.0
        break;

      default:
        // neutral: 保持默认值
        break;
    }

    // 应用情绪强度
    pitchShift = 1.0 + (pitchShift - 1.0) * emotionIntensity;
    speedMultiplier = 1.0 + (speedMultiplier - 1.0) * emotionIntensity;
    volumeBoost = 1.0 + (volumeBoost - 1.0) * emotionIntensity;

    return {
      emotionType,
      emotionIntensity,
      pitchShift,
      speedMultiplier,
      volumeBoost,
      reasoning: `规则分析: 检测到 ${intenseCount} 个激烈关键词, ${calmCount} 个冷静关键词, ${exclamationCount} 个感叹号`,
      confidence: 0.7, // 规则分析的置信度较低
    };
  }
}

// 导出单例
let analyzerInstance: EmotionAnalyzer | null = null;

export function getEmotionAnalyzer(model?: string): EmotionAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new EmotionAnalyzer(model);
  }
  return analyzerInstance;
}
