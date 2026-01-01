/**
 * Debate Viewer Component
 * 实时辩论观看器组件 - 使用 SSE 接收辩论进度
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// 评分卡片组件
function ScoreCard({ scoreData, roundId, onClose }: { scoreData: ScoreUpdate; roundId: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">第 {roundId} 轮评分</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
            title="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
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
    </div>
  );
}

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
  roundId?: number; // 所属轮次
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
  const [status, setStatus] = useState(initialStatus);
  const [currentRound, setCurrentRound] = useState(0);
  const [maxRounds, setMaxRounds] = useState(initialMaxRounds);
  const [messages, setMessages] = useState<Message[]>([]);
  // 追踪当前流式传输的消息的临时 key (agent_id -> timestamp)
  const streamingMessageKey = useRef<string | null>(null);
  const [scores, setScores] = useState<Map<number, ScoreUpdate>>(new Map());
  // 追踪每轮的最后一个消息索引 (round_id -> message_index)
  const [roundLastMessageIndex, setRoundLastMessageIndex] = useState<Map<number, number>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [expandedScoreRoundId, setExpandedScoreRoundId] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 追踪数据库中最新的消息数量，用于轮询同步
  const lastMessageCountRef = useRef(0);
  // 追踪是否应该自动滚动（默认不自动滚动，让用户手动控制）
  const shouldAutoScrollRef = useRef(false);

  // 连接 SSE
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      console.log(`[DebateViewer] 关闭旧连接，重新连接: debateId=${debateId}`);
      eventSourceRef.current.close();
    }

    console.log(`[DebateViewer] 正在连接 SSE: debateId=${debateId}, time=${new Date().toISOString()}`);

    const eventSource = new EventSource(
      `${window.location.origin}/api/debates/${debateId}/stream`
    );

    eventSource.onopen = () => {
      console.log(`[DebateViewer] SSE onopen 触发, time=${new Date().toISOString()}`);
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
          case "connected":
            console.log(`[DebateViewer] SSE 连接确认:`, data.data);
            break;
          case "debate_start":
            setStatus("running");
            setMaxRounds((data.data as { max_rounds: number }).max_rounds || 10);
            break;
          case "round_start":
            setCurrentRound((data.data as { sequence: number }).sequence);
            break;
          case "agent_start": {
            // Agent 开始发言,创建一个新的流式消息
            const agentData = data.data as { agent_id: number; role: string; stance?: string; round_id?: number };
            const tempKey = `streaming-${agentData.agent_id}-${Date.now()}`;
            streamingMessageKey.current = tempKey;
            console.log(`[DebateViewer] agent_start: ${agentData.role}, stance=${agentData.stance}, round_id=${agentData.round_id}, key=${tempKey}`);
            setMessages((prev) => {
              const newMessages = [...prev, {
                id: tempKey,
                role: agentData.role,
                stance: agentData.stance,
                content: "",
                timestamp: data.timestamp,
                streaming: true,
                roundId: agentData.round_id,
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
              // 创建新数组，并深拷贝最后一个消息对象
              const lastIndex = prev.length - 1;
              const lastMessage = prev[lastIndex];
              if (lastMessage && lastMessage.streaming) {
                // 创建新的消息对象，避免直接修改原对象
                const updatedMessage = {
                  ...lastMessage,
                  content: lastMessage.content + tokenData.token,
                };
                const updated = [
                  ...prev.slice(0, lastIndex),
                  updatedMessage,
                ];
                console.log(`[DebateViewer] token 追加, 内容长度: ${updatedMessage.content.length}`);
                return updated;
              }
              return prev;
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
                  roundId: updated[streamingIndex].roundId,
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
            // 记录这轮的最后一个消息索引
            setMessages((prev) => {
              const lastIndex = prev.length - 1;
              if (lastIndex >= 0) {
                setRoundLastMessageIndex((prevIndex) => new Map(prevIndex).set(scoreData.round_id, lastIndex));
              }
              return prev;
            });
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
    console.log(`[DebateViewer] 组件挂载, debateId=${debateId}, initialStatus=${initialStatus}, time=${new Date().toISOString()}`);

    // 加载数据库中的历史消息
    const loadExistingMessages = async () => {
      try {
        console.log(`[DebateViewer] 加载历史消息...`);
        const response = await fetch(`/api/debates/${debateId}/messages`);
        if (response.ok) {
          const data = await response.json();
          console.log(`[DebateViewer] 加载了 ${data.count} 条历史消息`);
          lastMessageCountRef.current = data.count;
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
      console.log(`[DebateViewer] 清理函数, time=${new Date().toISOString()}`);
      if (eventSourceRef.current) {
        console.log(`[DebateViewer] 关闭 EventSource`);
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [debateId]); // 只在 debateId 变化时重新连接

  // 轮询数据库状态（当 SSE 不可用时的后备方案）
  useEffect(() => {
    console.log(`[DebateViewer] 轮询 useEffect 触发: status=${status}, isConnected=${isConnected}, debateId=${debateId}`);

    // 只在辩论运行中且 SSE 未连接时启动轮询
    if (status !== 'running' || isConnected) {
      console.log(`[DebateViewer] 跳过轮询: status=${status}, isConnected=${isConnected}`);
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      return;
    }

    console.log(`[DebateViewer] 启动轮询模式，因为 SSE 未连接`);
    let isPolling = true;

    const pollStatus = async () => {
      if (!isPolling || status !== 'running' || isConnected) {
        console.log(`[DebateViewer] 轮询停止: isPolling=${isPolling}, status=${status}, isConnected=${isConnected}`);
        return;
      }

      console.log(`[DebateViewer] 执行轮询...`);
      try {
        // 获取最新的辩论状态和消息
        const response = await fetch(`/api/debates/${debateId}`);
        if (response.ok) {
          const debate = await response.json();
          console.log(`[DebateViewer] 轮询获取状态: ${debate.status}`);

          // 更新状态
          if (debate.status !== status) {
            setStatus(debate.status);
          }

          // 如果辩论已完成，停止轮询
          if (debate.status === 'completed' || debate.status === 'failed') {
            isPolling = false;
            if (pollTimeoutRef.current) {
              clearTimeout(pollTimeoutRef.current);
            }
            // 重新加载消息
            const messagesResponse = await fetch(`/api/debates/${debateId}/messages`);
            if (messagesResponse.ok) {
              const data = await messagesResponse.json();
              setMessages(data.messages);
            }
            return;
          }

          // 检查是否有新消息
          const messagesResponse = await fetch(`/api/debates/${debateId}/messages`);
          if (messagesResponse.ok) {
            const data = await messagesResponse.json();
            if (data.count > lastMessageCountRef.current) {
              console.log(`[DebateViewer] 轮询发现新消息: ${data.count - lastMessageCountRef.current} 条`);
              lastMessageCountRef.current = data.count;
              setMessages(data.messages);
            } else {
              console.log(`[DebateViewer] 轮询: 没有新消息，当前 ${data.count} 条`);
            }
          }
        }
      } catch (error) {
        console.error(`[DebateViewer] 轮询状态失败:`, error);
      }

      // 继续轮询，每2秒一次
      if (isPolling && !isConnected) {
        pollTimeoutRef.current = setTimeout(pollStatus, 2000);
      }
    };

    // 立即执行一次
    pollStatus();

    return () => {
      console.log(`[DebateViewer] 轮询清理`);
      isPolling = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [status, isConnected, debateId]);

  // 同步 initialStatus prop 到内部 state
  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  // 自动滚动到底部（只有当用户不在手动滚动时）
  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // 检测用户是否在手动滚动
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;

    // 如果用户向上滚动超过 150px，认为用户在手动查看历史消息
    const wasAutoScrolling = shouldAutoScrollRef.current;
    const isNearBottom = distanceToBottom < 150;

    shouldAutoScrollRef.current = isNearBottom;

    // 显示/隐藏"滚动到底部"按钮
    if (!isNearBottom && !showScrollToBottom) {
      setShowScrollToBottom(true);
    } else if (isNearBottom && showScrollToBottom) {
      setShowScrollToBottom(false);
    }

    // 如果用户从自动滚动状态切换到手动滚动，记录日志
    if (wasAutoScrolling && !isNearBottom) {
      console.log('[DebateViewer] 用户开始手动滚动');
    }
  }, [showScrollToBottom]);

  // 手动滚动到底部
  const scrollToBottom = useCallback(() => {
    shouldAutoScrollRef.current = true;
    setShowScrollToBottom(false);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

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
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border p-4 relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">辩论内容</h3>
          {/* 滚动到底部按钮 */}
          {showScrollToBottom && (
            <button
              onClick={scrollToBottom}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1"
              title="滚动到底部"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              最新消息
            </button>
          )}
        </div>
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="space-y-4 max-h-[600px] overflow-y-auto"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
              {status === 'pending' ? '等待辩论开始...' : '等待发言...'}
            </p>
          ) : (
            messages.map((msg, index) => {
              // 检查这条消息是否是某轮的最后一个消息
              const roundId = Object.keys(Object.fromEntries(roundLastMessageIndex)).find(
                (key) => roundLastMessageIndex.get(Number(key)) === index
              );
              const scoreData = roundId !== undefined ? scores.get(Number(roundId)) : undefined;

              return (
                <div key={msg.id}>
                  <div
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

                  {/* 如果这条消息是某轮的最后一个消息，显示评分按钮 */}
                  {scoreData && (
                    <div className="mt-2 flex justify-center">
                      <button
                        onClick={() => setExpandedScoreRoundId(Number(roundId))}
                        className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm rounded-full flex items-center gap-2 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                        title={`查看第 ${roundId} 轮评分`}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        查看第 {roundId} 轮评分
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 评分卡片弹窗 */}
      {expandedScoreRoundId !== null && scores.get(expandedScoreRoundId) && (
        <ScoreCard
          scoreData={scores.get(expandedScoreRoundId)!}
          roundId={expandedScoreRoundId}
          onClose={() => setExpandedScoreRoundId(null)}
        />
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
