/**
 * Debate Page Wrapper
 * 辩论页面包装器 - 管理启动/停止状态
 */

"use client";

import { useState, useCallback } from "react";
import { DebateViewer } from "./debate-viewer";
import { StartDebateButton } from "./start-debate-button";
import { StopDebateButton } from "./stop-debate-button";
import { VoiceSettingsButton } from "@/components/voice";

interface DebatePageWrapperProps {
  debateId: number;
  initialStatus: string;
  topic: string;
  proDefinition: string;
  conDefinition: string;
  maxRounds: number;
}

export function DebatePageWrapper({
  debateId,
  initialStatus,
  topic,
  proDefinition,
  conDefinition,
  maxRounds
}: DebatePageWrapperProps) {
  const [status, setStatus] = useState(initialStatus);

  const handleStarted = useCallback(() => {
    // 启动成功后更新状态（不重新挂载组件）
    setStatus("running");
  }, []);

  const handleStopped = useCallback(() => {
    // 停止成功后更新状态
    setStatus("failed");
  }, []);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{topic}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            状态: <span className={`font-medium ${
              status === 'completed' ? 'text-green-600' :
              status === 'running' ? 'text-blue-600' :
              status === 'failed' ? 'text-red-600' :
              'text-slate-600'
            }`}>
              {status === 'completed' ? '已完成' :
               status === 'running' ? '进行中' :
               status === 'failed' ? '失败' :
               '等待中'}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <VoiceSettingsButton userId={`debate-${debateId}`} />
          {status === 'pending' && (
            <StartDebateButton
              debateId={debateId}
              onStarted={handleStarted}
            />
          )}
          {status === 'running' && (
            <StopDebateButton debateId={debateId} onStopped={handleStopped} />
          )}
        </div>
      </div>

      {/* 立场定义卡片 */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-5 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200">正方立场</h3>
          </div>
          <p className="text-slate-700 dark:text-slate-300">{proDefinition}</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-5 border-2 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-red-800 dark:text-red-200">反方立场</h3>
          </div>
          <p className="text-slate-700 dark:text-slate-300">{conDefinition}</p>
        </div>
      </div>

      <DebateViewer
        debateId={debateId}
        initialStatus={status}
        maxRounds={maxRounds}
      />
    </>
  );
}
