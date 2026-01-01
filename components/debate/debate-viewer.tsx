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
  streaming?: boolean; // 是否正在流式传输
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
  maxRounds?: number;
}

export function DebateViewer({ debateId, initialStatus, maxRounds: initialMaxRounds = 10 }: DebateViewerProps) {
  const router = useRouter();
  // 检测是否需要自动启动
  const [autoStart, setAutoStart] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [currentRound, setCurrentRound] = useState(0);
  const [maxRounds, setMaxRounds] = useState(initialMaxRounds);
  const [messages, setMessages] = useState<Message[]>([]);
  // 追踪当前流式传输的消息的临时 key (agent_id -> timestamp)
  const streamingMessageKey = useRef<string | null>(null);
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

    console.log(`[DebateViewer] 正在连接 SSE: debateId=${debateId}`);

    const eventSource = new EventSource(
      `${window.location.origin}/api/debates/${debateId}/stream`
    );

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      setReconnectAttempts(0);
      console.log("[DebateViewer] SSE 连接成功");
    };

    eventSource.onmessage = (event) => {
      console.log(`[DebateViewer] 收到 SSE 原始数据:`, event.data);
      try {
        const data: SSEEvent = JSON.parse(event.data);
        console.log(`[DebateViewer] 解析后的事件:`, data.type, data.data);

        switch (data.type) {
          case "debate_start":
            setStatus("running");
            setMaxRounds((data.data as { max_rounds: number }).max_rounds || 10);
            break;
          case "round_start":
            setCurrentRound((data.data as { sequence: number }).sequence);
            break;
          case "agent_start": {
            // Agent 开始发言,创建一个新的流式消息
            const agentData = data.data as { agent_id: number; role: string; stance?: string };
            const tempKey = `streaming-${agentData.agent_id}-${Date.now()}`;
            streamingMessageKey.current = tempKey;
            console.log(`[DebateViewer] agent_start: ${agentData.role}, stance=${agentData.stance}, key=${tempKey}`);
            setMessages((prev) => {
              const newMessages = [...prev, {
                id: tempKey,
                role: agentData.role,
                stance: agentData.stance,
                content: "",
                timestamp: data.timestamp,
                streaming: true,
              }];
              console.log(`[DebateViewer] 消息数量: ${prev.length} -> ${newMessages.length}`);
              return newMessages;
            });
            break;
          }
          case "token": {
            // 流式 token 更新
            const tokenData = data.data as { token: string };
            setMessages((prev) => {
              const updated = [...prev];
              // 找到最后一个正在流式传输的消息并追加 token
              const lastMessage = updated[updated.length - 1];
              if (lastMessage && lastMessage.streaming) {
                lastMessage.content += tokenData.token;
                console.log(`[DebateViewer] token 追加, 内容长度: ${lastMessage.content.length}`);
              }
              return updated;
            });
            break;
          }
          case "agent_end": {
            // Agent 发言结束,替换流式消息为最终消息
            const agentData = data.data as { agent_id: number; content: string };
            console.log(`[DebateViewer] agent_end: agent_id=${agentData.agent_id}, content长度=${agentData.content.length}`);
            setMessages((prev) => {
              const updated = [...prev];
              const streamingIndex = updated.findIndex((m) => m.streaming);
              if (streamingIndex >= 0) {
                // 替换流式消息为最终消息
                updated[streamingIndex] = {
                  id: `agent-${agentData.agent_id}-${Date.now()}`,
                  role: updated[streamingIndex].role,
                  stance: updated[streamingIndex].stance,
                  content: agentData.content,
                  timestamp: data.timestamp,
                  streaming: false,
                };
                console.log(`[DebateViewer] 替换流式消息, 索引=${streamingIndex}`);
              }
              streamingMessageKey.current = null;
              return updated;
            });
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
  }, [debateId]); // 移除 reconnectAttempts 依赖,避免无限循环

  // 组件挂载时加载历史消息并连接 SSE
  useEffect(() => {
    // 检测 URL 中的 autoStart 参数
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const shouldAutoStart = urlParams.get('autoStart') === 'true';
      setAutoStart(shouldAutoStart);
      console.log(`[DebateViewer] 组件挂载, debateId=${debateId}, initialStatus=${initialStatus}, autoStart=${shouldAutoStart}`);
    } else {
      console.log(`[DebateViewer] 组件挂载, debateId=${debateId}, initialStatus=${initialStatus}`);
    }

    // 加载数据库中的历史消息
    const loadExistingMessages = async () => {
      try {
        console.log(`[DebateViewer] 加载历史消息...`);
        const response = await fetch(`/api/debates/${debateId}/messages`);
        if (response.ok) {
          const data = await response.json();
          console.log(`[DebateViewer] 加载了 ${data.count} 条历史消息`);
          setMessages(data.messages);
        } else {
          console.error(`[DebateViewer] 加载历史消息失败:`, response.status);
        }
      } catch (error) {
        console.error(`[DebateViewer] 加载历史消息出错:`, error);
      }
    };

    loadExistingMessages();
    connectSSE();

    return () => {
      console.log(`[DebateViewer] 组件卸载`);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []); // 只在挂载时执行一次

  // 自动启动辩论（当 SSE 连接成功且 autoStart=true 时）
  useEffect(() => {
    const autoStartDebate = async () => {
      if (!autoStart || hasStarted || !isConnected) {
        return;
      }

      // 只在 pending 状态下启动
      if (status !== 'pending') {
        console.log(`[DebateViewer] 跳过自动启动, 状态不是 pending: ${status}`);
        return;
      }

      try {
        console.log(`[DebateViewer] 自动启动辩论: debateId=${debateId}`);
        setHasStarted(true);

        // 清理 URL 参数
        const url = new URL(window.location.href);
        url.searchParams.delete('autoStart');
        window.history.replaceState({}, '', url.toString());

        const response = await fetch(`/api/debates/${debateId}/start`, {
          method: "POST",
        });

        if (!response.ok) {
          const error = await response.json();
          console.error(`[DebateViewer] 自动启动失败:`, error);
          setError(`自动启动失败: ${error.error || '未知错误'}`);
        } else {
          console.log(`[DebateViewer] 自动启动成功`);
        }
      } catch (err) {
        console.error(`[DebateViewer] 自动启动出错:`, err);
        setError(err instanceof Error ? err.message : '自动启动失败');
        setHasStarted(false); // 允许重试
      }
    };

    // 延迟启动，确保 SSE 连接已建立
    const timer = setTimeout(() => {
      autoStartDebate();
    }, 500);

    return () => clearTimeout(timer);
  }, [autoStart, hasStarted, isConnected, status, debateId]);

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
                } ${msg.streaming ? 'animate-pulse' : ''}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    msg.role === 'audience'
                      ? 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200'
                      : msg.stance === 'pro'
                        ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                        : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                  }`}>
                    {msg.role === 'audience' ? '观众' : msg.stance === 'pro' ? '正方' : '反方'}
                    {msg.streaming && ' (生成中...)'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {msg.content || (msg.streaming ? '正在思考...' : '')}
                </p>
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
