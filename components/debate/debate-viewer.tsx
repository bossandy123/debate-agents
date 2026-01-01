/**
 * Debate Viewer Component
 * 实时辩论观看器组件 - 使用 SSE 接收辩论进度
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface SSEEvent {
  type: string;
  data: unknown;
  timestamp: string;
}

interface Message {
  id: string;
  role: string;
  stance?: string;
  content: string;
  timestamp: string;
}

interface ScoreUpdate {
  round_id: number;
  scores: {
    pro: { logic: number; rebuttal: number; clarity: number; evidence: number; total: number };
    con: { logic: number; rebuttal: number; clarity: number; evidence: number; total: number };
  };
}

interface DebateViewerProps {
  debateId: number;
  initialStatus: string;
}

export function DebateViewer({ debateId, initialStatus }: DebateViewerProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [currentRound, setCurrentRound] = useState(0);
  const [maxRounds, setMaxRounds] = useState(10);
  const [messages, setMessages] = useState<Message[]>([]);
  const [scores, setScores] = useState<Map<number, ScoreUpdate>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 连接 SSE
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(
      `${window.location.origin}/api/debates/${debateId}/stream`
    );

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      setReconnectAttempts(0);
      console.log("SSE connected");
    };

    eventSource.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data);

        switch (data.type) {
          case "debate_start":
            setStatus("running");
            setMaxRounds((data.data as { max_rounds: number }).max_rounds || 10);
            break;
          case "round_start":
            setCurrentRound((data.data as { sequence: number }).sequence);
            break;
          case "agent_end": {
            const agentData = data.data as { agent_id: number; content: string };
            setMessages((prev) => [...prev, {
              id: `${agentData.agent_id}-${Date.now()}`,
              role: "agent",
              content: agentData.content,
              timestamp: data.timestamp,
            }]);
            break;
          }
          case "audience_speech": {
            const audienceData = data.data as { agent_id: number; audience_type: string; content: string };
            setMessages((prev) => [...prev, {
              id: `audience-${audienceData.agent_id}-${Date.now()}`,
              role: "audience",
              content: `[${audienceData.audience_type}] ${audienceData.content}`,
              timestamp: data.timestamp,
            }]);
            break;
          }
          case "score_update": {
            const scoreData = data.data as ScoreUpdate;
            setScores((prev) => new Map(prev).set(scoreData.round_id, scoreData));
            break;
          }
          case "round_end":
            // 轮次结束
            break;
          case "debate_end":
            setStatus("completed");
            eventSource.close();
            break;
          case "error":
            setError((data.data as { error: string }).error || "发生错误");
            setStatus("failed");
            break;
        }
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      setIsConnected(false);

      // 自动重连逻辑
      if (reconnectAttempts < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(`Reconnecting in ${delay}ms...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts((prev) => prev + 1);
          connectSSE();
        }, delay);
      } else {
        setError("连接失败，请刷新页面重试");
      }
    };

    eventSourceRef.current = eventSource;
  }, [debateId, reconnectAttempts]);

  // 组件挂载时连接 SSE
  useEffect(() => {
    if (status === "running" || status === "pending") {
      connectSSE();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [status, connectSSE]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="space-y-6">
      {/* 连接状态和进度 */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">辩论进度</h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {isConnected ? '已连接' : '未连接'}
            </span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600 dark:text-slate-400">
              第 {currentRound} / {maxRounds} 轮
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              {Math.round((currentRound / maxRounds) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((currentRound / maxRounds) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* 状态标签 */}
        <div className="flex gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
            status === 'running' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
            status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}>
            {status === 'completed' ? '已完成' :
             status === 'running' ? '进行中' :
             status === 'failed' ? '失败' : '等待中'}
          </span>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => {
              setError(null);
              connectSSE();
            }}
            className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
          >
            重新连接
          </button>
        </div>
      )}

      {/* 辩论内容 */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border p-4">
        <h3 className="text-lg font-semibold mb-4">辩论内容</h3>
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
              {status === 'pending' ? '等待辩论开始...' : '等待发言...'}
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 rounded-lg ${
                  msg.role === 'audience'
                    ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
                    : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    msg.role === 'audience'
                      ? 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200'
                      : 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                  }`}>
                    {msg.role === 'audience' ? '观众' : '辩手'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 评分面板 */}
      {scores.size > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border p-4">
          <h3 className="text-lg font-semibold mb-4">评分</h3>
          <div className="space-y-4">
            {Array.from(scores.entries()).map(([roundId, scoreData]) => (
              <div key={roundId} className="border-b border-slate-200 dark:border-slate-700 pb-4 last:border-0">
                <p className="text-sm font-medium mb-2">第 {roundId} 轮评分</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">正方</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>逻辑性:</span>
                        <span>{scoreData.scores.pro.logic}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>反驳能力:</span>
                        <span>{scoreData.scores.pro.rebuttal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>清晰度:</span>
                        <span>{scoreData.scores.pro.clarity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>论据充分性:</span>
                        <span>{scoreData.scores.pro.evidence}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1">
                        <span>总分:</span>
                        <span>{scoreData.scores.pro.total}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">反方</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>逻辑性:</span>
                        <span>{scoreData.scores.con.logic}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>反驳能力:</span>
                        <span>{scoreData.scores.con.rebuttal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>清晰度:</span>
                        <span>{scoreData.scores.con.clarity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>论据充分性:</span>
                        <span>{scoreData.scores.con.evidence}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1">
                        <span>总分:</span>
                        <span>{scoreData.scores.con.total}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 完成后的操作按钮 */}
      {status === 'completed' && (
        <div className="flex gap-4">
          <button
            onClick={() => router.push(`/debate/${debateId}/report`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            查看复盘报告
          </button>
          <button
            onClick={() => router.push('/history')}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            返回历史记录
          </button>
        </div>
      )}
    </div>
  );
}
