/**
 * 情绪分析模块
 * Feature: 001-voice-emotion
 */

export { buildEmotionAnalysisPrompt, DEFAULT_EMOTION_RESULT } from './prompts';
export { EmotionAnalyzer, getEmotionAnalyzer } from './analyzer';
export type { EmotionAnalysisOptions, EmotionAnalysisResultWithModel } from './analyzer';
