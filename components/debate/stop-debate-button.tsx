/**
 * Stop Debate Button Component
 * 停止辩论按钮组件
 */

"use client";

import { useState } from "react";

interface StopDebateButtonProps {
  debateId: number;
  onStopped?: () => void;
}

export function StopDebateButton({ debateId, onStopped }: StopDebateButtonProps) {
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStop = async () => {
    setIsStopping(true);
    setError(null);

    try {
      const response = await fetch(`/api/debates/${debateId}/stop`, {
        method: "POST",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "停止辩论失败");
      }

      // 停止成功，通知父组件更新状态
      onStopped?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsStopping(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleStop}
        disabled={isStopping}
        className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isStopping ? "停止中..." : "停止辩论"}
      </button>
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
