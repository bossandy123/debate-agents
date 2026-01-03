'use client';

/**
 * VoiceSettings 组件
 * Feature: 001-voice-emotion
 *
 * 语音设置面板组件
 * 包含语音风格选择、播放速度、自动播放、音量控制
 */

import React, { useState, useEffect } from 'react';
import { VoiceSettings as VoiceSettingsType } from '@/lib/voice/types';

export interface VoiceSettingsProps {
  userId: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  userId,
  isOpen = true,
  onClose,
}) => {
  const [settings, setSettings] = useState<VoiceSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<'success' | 'error' | null>(null);

  // 加载设置
  useEffect(() => {
    if (isOpen && userId) {
      loadSettings();
    }
  }, [isOpen, userId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/voice/settings?userId=${encodeURIComponent(userId)}`);
      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('[VoiceSettings] Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updates: Partial<VoiceSettingsType>) => {
    if (!settings) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch('/api/voice/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...updates,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        setSaveMessage('success');
        setTimeout(() => setSaveMessage(null), 2000);
      } else {
        setSaveMessage('error');
        setTimeout(() => setSaveMessage(null), 2000);
      }
    } catch (error) {
      console.error('[VoiceSettings] Failed to save settings:', error);
      setSaveMessage('error');
      setTimeout(() => setSaveMessage(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500 py-8">
          无法加载语音设置
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">语音设置</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="关闭设置"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* 总开关 */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">启用语音</label>
            <p className="text-xs text-gray-500 mt-0.5">开启后消息将自动转换为语音</p>
          </div>
          <button
            onClick={() => saveSettings({ voiceEnabled: !settings.voiceEnabled })}
            disabled={saving}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${settings.voiceEnabled ? 'bg-blue-500' : 'bg-gray-300'}
              ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${settings.voiceEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* 分隔线 */}
        <hr className="border-gray-200" />

        {/* 自动播放 */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">自动播放</label>
            <p className="text-xs text-gray-500 mt-0.5">语音生成完成后自动开始播放</p>
          </div>
          <button
            onClick={() => saveSettings({ autoPlay: !settings.autoPlay })}
            disabled={saving || !settings.voiceEnabled}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${settings.autoPlay && settings.voiceEnabled ? 'bg-blue-500' : 'bg-gray-300'}
              ${saving || !settings.voiceEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${settings.autoPlay && settings.voiceEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* 播放速度 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-900">播放速度</label>
            <span className="text-sm text-gray-600 font-mono">{settings.playbackSpeed}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={settings.playbackSpeed}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setSettings({ ...settings, playbackSpeed: value });
              saveSettings({ playbackSpeed: value });
            }}
            disabled={saving || !settings.voiceEnabled}
            className={`
              w-full h-2 rounded-lg appearance-none cursor-pointer
              ${saving || !settings.voiceEnabled ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'}
            `}
            style={{
              background: `linear-gradient(to right, #3b82f6 ${((settings.playbackSpeed - 0.5) / 1.5) * 100}%, #e5e7eb ${((settings.playbackSpeed - 0.5) / 1.5) * 100}%)`,
            }}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.5x</span>
            <span>1.0x</span>
            <span>2.0x</span>
          </div>
        </div>

        {/* 默认音量 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-900">默认音量</label>
            <span className="text-sm text-gray-600 font-mono">{Math.round(settings.defaultVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.0"
            step="0.05"
            value={settings.defaultVolume}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setSettings({ ...settings, defaultVolume: value });
              saveSettings({ defaultVolume: value });
            }}
            disabled={saving || !settings.voiceEnabled}
            className={`
              w-full h-2 rounded-lg appearance-none cursor-pointer
              ${saving || !settings.voiceEnabled ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'}
            `}
            style={{
              background: `linear-gradient(to right, #3b82f6 ${settings.defaultVolume * 100}%, #e5e7eb ${settings.defaultVolume * 100}%)`,
            }}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>静音</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* 分隔线 */}
        <hr className="border-gray-200" />

        {/* 后台播放 */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">后台播放</label>
            <p className="text-xs text-gray-500 mt-0.5">切换页面时继续播放</p>
          </div>
          <button
            onClick={() => saveSettings({ backgroundPlay: !settings.backgroundPlay })}
            disabled={saving || !settings.voiceEnabled}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${settings.backgroundPlay && settings.voiceEnabled ? 'bg-blue-500' : 'bg-gray-300'}
              ${saving || !settings.voiceEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${settings.backgroundPlay && settings.voiceEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* 自动播放下一条 */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">连续播放</label>
            <p className="text-xs text-gray-500 mt-0.5">自动播放下一条消息</p>
          </div>
          <button
            onClick={() => saveSettings({ autoAdvance: !settings.autoAdvance })}
            disabled={saving || !settings.voiceEnabled}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${settings.autoAdvance && settings.voiceEnabled ? 'bg-blue-500' : 'bg-gray-300'}
              ${saving || !settings.voiceEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${settings.autoAdvance && settings.voiceEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* TTS 提供商 */}
        <div>
          <label className="text-sm font-medium text-gray-900 block mb-2">语音服务提供商</label>
          <div className="grid grid-cols-3 gap-2">
            {(['aliyun', 'doubao', 'tencent'] as const).map((provider) => (
              <button
                key={provider}
                onClick={() => saveSettings({ preferredProvider: provider })}
                disabled={saving || !settings.voiceEnabled}
                className={`
                  px-3 py-2 text-sm rounded-md border transition-all
                  ${settings.preferredProvider === provider && settings.voiceEnabled
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }
                  ${saving || !settings.voiceEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {provider === 'aliyun' && '阿里云'}
                {provider === 'doubao' && '豆包'}
                {provider === 'tencent' && '腾讯'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer - 保存状态 */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        {saveMessage === 'success' && (
          <div className="flex items-center justify-center text-sm text-green-600">
            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            设置已保存
          </div>
        )}
        {saveMessage === 'error' && (
          <div className="flex items-center justify-center text-sm text-red-600">
            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            保存失败，请重试
          </div>
        )}
        {saving && (
          <div className="flex items-center justify-center text-sm text-gray-500">
            <svg className="animate-spin h-4 w-4 mr-1.5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            保存中...
          </div>
        )}
        {!saveMessage && !saving && (
          <div className="text-center text-xs text-gray-500">
            设置会自动保存
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 简化的语音设置按钮组件
 */
export interface VoiceSettingsButtonProps {
  userId: string;
}

export const VoiceSettingsButton: React.FC<VoiceSettingsButtonProps> = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        aria-label="打开语音设置"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
        语音设置
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative max-w-md w-full mx-4">
            <VoiceSettings userId={userId} isOpen={isOpen} onClose={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
};
