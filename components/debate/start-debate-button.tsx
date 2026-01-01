/**
 * Start Debate Button Component
 * 启动辩论按钮组件
 */

"use client";

import { useState } from "react";

interface StartDebateButtonProps {
  debateId: number;
  onStarted?: () => void;
}

export function StartDebateButton({ debateId, onStarted }: StartDebateButtonProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    console.log(`[StartDebateButton] 启动辩论, debateId=${debateId}, time=${new Date().toISOString()}`);
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch(`/api/debates/${debateId}/start`, {
        method: "POST",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "启动辩论失败");
      }

      console.log(`[StartDebateButton] 启动成功, time=${new Date().toISOString()}`);
      // 启动成功，通知父组件更新状态
      onStarted?.();
    } catch (err) {
      console.error(`[StartDebateButton] 启动失败:`, err);
      setError(err instanceof Error ? err.message : String(err));
      setIsStarting(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleStart}
        disabled={isStarting}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isStarting ? "启动中..." : "启动辩论"}
      </button>
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
