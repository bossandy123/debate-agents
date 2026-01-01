/**
 * Debate Page Wrapper
 * 辩论页面包装器 - 管理启动/停止状态
 */

"use client";

import { useState, useCallback } from "react";
import { DebateViewer } from "./debate-viewer";
import { StartDebateButton } from "./start-debate-button";
import { StopDebateButton } from "./stop-debate-button";

interface DebatePageWrapperProps {
  debateId: number;
  initialStatus: string;
  topic: string;
  maxRounds: number;
}

export function DebatePageWrapper({ debateId, initialStatus, topic, maxRounds }: DebatePageWrapperProps) {
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
      <DebateViewer
        debateId={debateId}
        initialStatus={status}
        maxRounds={maxRounds}
      />
    </>
  );
}
