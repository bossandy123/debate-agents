/**
 * 流式语音测试页面
 */

'use client';

import { useState } from 'react';
import { VoiceControl } from '@/components/voice';
import { useVoicePlayback } from '@/lib/voice/hooks/useVoicePlayback';

export default function TestVoicePage() {
  const [text, setText] = useState(
    '你好，这是一个测试。今天天气很好，我们来测试一下流式语音播放功能。'
  );

  const voicePlayback = useVoicePlayback();
  const messageId = 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">语音播放测试</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              测试文本
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              placeholder="输入要转换的文本..."
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">语音控制</h3>
            <VoiceControl
              messageId={messageId}
              text={text}
              emotionType="neutral"
              loading={voicePlayback.loading.has(messageId)}
              playing={voicePlayback.playingMessageId === messageId}
              disabled={voicePlayback.playingMessageId !== null && voicePlayback.playingMessageId !== messageId}
              onPlay={() => voicePlayback.playVoice(messageId, text)}
              onStop={() => voicePlayback.stopVoice()}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium mb-2">使用说明</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• 点击播放按钮开始语音播放</li>
              <li>• 使用阿里云TTS进行语音合成</li>
              <li>• 实时流式传输音频数据</li>
              <li>• 点击停止按钮可以中断播放</li>
            </ul>
          </div>

          {/* 状态显示 */}
          {voicePlayback.loading.has(messageId) && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                正在生成语音...
              </p>
            </div>
          )}

          {voicePlayback.playingMessageId === messageId && (
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                正在播放...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
