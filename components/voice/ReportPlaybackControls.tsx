'use client';

/**
 * ReportPlaybackControls 组件
 * Feature: 001-voice-emotion
 *
 * 复盘报告页面的客户端包装器
 * 为服务端组件提供客户端交互功能
 */

import React from 'react';
import { PlaybackControls, VoiceMessage } from './PlaybackControls';

export interface ReportPlaybackControlsProps {
  debateId: number;
  rounds: Array<{
    round_id: number;
    messages: Array<{
      agent_id: string;
      content: string;
      created_at: string;
    }>;
  }>;
}

export const ReportPlaybackControls: React.FC<ReportPlaybackControlsProps> = ({
  debateId,
  rounds,
}) => {
  // 将轮次数据转换为 VoiceMessage 格式
  const messages: VoiceMessage[] = [];
  let messageId = 1;

  rounds.forEach(round => {
    round.messages.forEach(msg => {
      messages.push({
        messageId: messageId++,
        text: msg.content,
      });
    });
  });

  // 生成用户 ID（在实际应用中应该从认证系统获取）
  const userId = `report-user-${debateId}`;

  return (
    <PlaybackControls
      debateId={debateId}
      userId={userId}
      messages={messages}
    />
  );
};
