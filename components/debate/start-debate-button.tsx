/**
 * Start Debate Button Component
 * 启动辩论按钮组件
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface StartDebateButtonProps {
  debateId: number;
}

export function StartDebateButton({ debateId }: StartDebateButtonProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
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

      // 刷新页面以更新状态
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
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
