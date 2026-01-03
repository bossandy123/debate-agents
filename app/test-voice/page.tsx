/**
 * 流式语音测试页面
 */

'use client';

import { useState } from 'react';
import { StreamingVoicePlayer } from '@/components/voice';

export default function TestVoicePage() {
  const [text, setText] = useState(
    '你好，这是一个测试。今天天气很好，我们来测试一下流式语音播放功能。'
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">流式语音播放测试</h1>

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
            <h3 className="text-lg font-medium">流式播放器</h3>
            <StreamingVoicePlayer
              text={text}
              autoPlay={false}
              onPlayStart={() => console.log('开始播放')}
              onPlayEnd={() => console.log('播放结束')}
              onError={(error) => console.error('播放错误:', error)}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium mb-2">使用说明</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• 点击播放按钮开始流式播放</li>
              <li>• 音频会边生成边播放，降低延迟</li>
              <li>• 可以使用音量滑块调整音量</li>
              <li>• 点击暂停按钮停止播放</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
