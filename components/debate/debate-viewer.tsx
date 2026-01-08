/**
 * Debate Viewer Component
 * 实时辩论观看器组件 - 使用 SSE 接收辩论进度
 * Feature: 001-voice-emotion (语音播放集成)
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { useVoicePlayback } from "@/lib/voice/hooks/useVoicePlayback";
import { VoiceControl } from "@/components/voice/VoiceControl";

// 评分卡片组件 - Apple style
function ScoreCard({ scoreData, roundId, onClose }: { scoreData: ScoreUpdate; roundId: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl border border-border shadow-apple-lg max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <h3 className="text-lg font-semibold">第 {roundId} 轮评分</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg transition-apple"
            title="关闭"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-border/50 bg-pro/5 p-4">
            <p className="text-sm font-semibold text-pro mb-3">正方</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">逻辑性</span>
                <span className="font-medium">{scoreData.scores.pro.logic}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">反驳能力</span>
                <span className="font-medium">{scoreData.scores.pro.rebuttal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">清晰度</span>
                <span className="font-medium">{scoreData.scores.pro.clarity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">论据充分性</span>
                <span className="font-medium">{scoreData.scores.pro.evidence}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border/50">
                <span className="font-semibold">总分</span>
                <span className="font-bold text-pro">{scoreData.scores.pro.total}</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border/50 bg-con/5 p-4">
            <p className="text-sm font-semibold text-con mb-3">反方</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">逻辑性</span>
                <span className="font-medium">{scoreData.scores.con.logic}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">反驳能力</span>
                <span className="font-medium">{scoreData.scores.con.rebuttal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">清晰度</span>
                <span className="font-medium">{scoreData.scores.con.clarity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">论据充分性</span>
                <span className="font-medium">{scoreData.scores.con.evidence}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border/50">
                <span className="font-semibold">总分</span>
                <span className="font-bold text-con">{scoreData.scores.con.total}</span>
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
  const [expandedScoreRoundId, setExpandedScoreRoundId] = useState<number | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 追踪数据库中最新的消息数量，用于轮询同步
  const lastMessageCountRef = useRef(0);
  // 追踪是否应该自动滚动（默认不自动滚动，让用户手动控制）
  const shouldAutoScrollRef = useRef(false);

  // Feature: 001-voice-emotion - 语音播放集成
  const voicePlayback = useVoicePlayback({ debateId, autoPlay: false });

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

  return (
    <div className="space-y-6">
      {/* 连接状态和进度 - Apple style */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">辩论进度</h2>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground">
              {isConnected ? '已连接' : '未连接'}
            </span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground">
              第 {currentRound} / {maxRounds} 轮
            </span>
            <span className="text-muted-foreground">
              {Math.round((currentRound / maxRounds) * 100)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((currentRound / maxRounds) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* 状态标签 */}
        <div className="flex gap-2 flex-wrap">
          <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
            status === 'completed' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
            status === 'running' ? 'bg-primary/10 text-primary' :
            status === 'failed' ? 'bg-red-500/10 text-red-700 dark:text-red-400' :
            'bg-muted text-muted-foreground'
          }`}>
            {status === 'completed' ? '已完成' :
             status === 'running' ? '进行中' :
             status === 'failed' ? '失败' : '等待中'}
          </span>

          {/* Feature: 001-voice-emotion - 语音开关 */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-apple ${
              voiceEnabled
                ? 'bg-audience/10 text-audience hover:bg-audience/20'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
            title={voiceEnabled ? '点击关闭语音' : '点击开启语音'}
          >
            {voiceEnabled ? (
              <>
                <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                语音开启
              </>
            ) : (
              <>
                <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 1.414L15 10l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293zM10 7.293a1 1 0 011.414 0L12 8l1.293-1.293a1 1 0 111.414 1.414L13 9l1.293 1.293a1 1 0 01-1.414 1.414L12 10.586l1.293 1.293a1 1 0 01-1.414 1.414L10.586 11 9.293 9.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                语音关闭
              </>
            )}
          </button>
        </div>
      </div>

      {/* 错误提示 - Apple style */}
      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => {
              setError(null);
              connectSSE();
            }}
            className="mt-2 text-sm text-destructive underline"
          >
            重新连接
          </button>
        </div>
      )}

      {/* Feature: 001-voice-emotion - 语音错误提示 - Apple style */}
      {voiceEnabled && voicePlayback.errors.size > 0 && (
        <div className="rounded-xl border border-yellow-500/50 bg-yellow-500/5 p-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">语音服务不可用</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                部分语音生成失败，可能是网络问题或 API 配额限制。您可以：
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setVoiceEnabled(false)}
                  className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 rounded hover:bg-yellow-500/20 transition-apple"
                >
                  暂时关闭语音
                </button>
                <button
                  onClick={() => voicePlayback.cleanup()}
                  className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 rounded hover:bg-yellow-500/20 transition-apple"
                >
                  重试
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 辩论内容 - 画布展示 - Apple style */}
      <div className="space-y-6">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-muted/50 rounded-lg mb-4">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">
              {status === 'pending' ? '等待辩论开始...' : '等待发言...'}
            </p>
          </div>
        ) : (
          <div
            ref={messagesContainerRef}
            className="space-y-8"
          >
            {(() => {
              // 按轮次分组消息
              const roundsMap = new Map<number, Message[]>();
              const roundScoresMap = new Map<number, ScoreUpdate>();
              const messagesWithoutRound: Message[] = [];

              messages.forEach((msg) => {
                if (msg.roundId) {
                  if (!roundsMap.has(msg.roundId)) {
                    roundsMap.set(msg.roundId, []);
                  }
                  roundsMap.get(msg.roundId)!.push(msg);
                } else {
                  // 没有 roundId 的消息（可能是旧数据或其他类型的消息）
                  messagesWithoutRound.push(msg);
                }
              });

              // 将评分数据与轮次关联
              scores.forEach((scoreData, roundId) => {
                roundScoresMap.set(roundId, scoreData);
              });

              // 按轮次排序
              const sortedRounds = Array.from(roundsMap.keys()).sort((a, b) => a - b);

              return (
                <>
                  {/* 显示有 roundId 的消息（按轮次分组） */}
                  {sortedRounds.map((roundId) => {
                    const roundMessages = roundsMap.get(roundId)!;
                    const scoreData = roundScoresMap.get(roundId);
                    const hasStreaming = roundMessages.some(m => m.streaming);

                    return (
                      <div key={roundId} className="rounded-xl border border-border bg-card overflow-hidden">
                        {/* 轮次标题 - Apple style */}
                        <div className="border-b border-border px-6 py-4 bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">第 {roundId} 轮</span>
                              {hasStreaming && (
                                <span className="flex items-center gap-1 text-xs text-primary font-medium">
                                  <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  进行中
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 消息内容 - Apple style */}
                        <div className="p-6 space-y-4">
                          {roundMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`rounded-lg border border-border/50 bg-muted/20 p-4 ${msg.streaming ? 'animate-pulse' : ''}`}
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <span className={`text-xs font-semibold rounded px-2 py-0.5 ${
                                  msg.role === 'audience'
                                    ? 'bg-audience/10 text-audience'
                                    : msg.stance === 'pro'
                                      ? 'bg-pro/10 text-pro'
                                      : 'bg-con/10 text-con'
                                }`}>
                                  {msg.role === 'audience' ? '观众' : msg.stance === 'pro' ? '正方' : '反方'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(msg.timestamp).toLocaleTimeString()}
                                </span>

                                {/* Feature: 001-voice-emotion - 语音控制按钮 */}
                                {msg.content && !msg.streaming && voiceEnabled && (
                                  <div className="ml-auto">
                                    <VoiceControl
                                      messageId={parseInt(msg.id.replace(/\D/g, '')) || 0}
                                      text={msg.content}
                                      audioUrl={voicePlayback.audioUrls.get(parseInt(msg.id.replace(/\D/g, '')) || 0)}
                                      loading={voicePlayback.loading.has(parseInt(msg.id.replace(/\D/g, '')) || 0)}
                                      disabled={voicePlayback.playingMessageId !== null && voicePlayback.playingMessageId !== parseInt(msg.id.replace(/\D/g, ''))}
                                      playing={voicePlayback.playingMessageId === parseInt(msg.id.replace(/\D/g, ''))}
                                      onPlay={() => voicePlayback.playVoice(parseInt(msg.id.replace(/\D/g, '')) || 0, msg.content)}
                                      onStop={() => voicePlayback.stopVoice()}
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                {msg.content ? (
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw, rehypeSanitize]}
                                    components={{
                                      p: ({ children }) => <p className="mb-0 text-foreground">{children}</p>,
                                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
                                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1">{children}</ol>,
                                      li: ({ children }) => <li className="text-foreground">{children}</li>,
                                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                      em: ({ children }) => <em className="italic">{children}</em>,
                                      code: ({ className, children }) => {
                                        const isInline = !className?.includes('language-');
                                        return isInline ? (
                                          <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono text-primary">{children}</code>
                                        ) : (
                                          <code className="block p-3 bg-muted rounded-lg text-xs font-mono text-foreground overflow-x-auto">{children}</code>
                                        );
                                      },
                                      blockquote: ({ children }) => <blockquote className="border-l-4 border-border/50 pl-4 italic text-muted-foreground">{children}</blockquote>,
                                    }}
                                  >
                                    {msg.content}
                                  </ReactMarkdown>
                                ) : (
                                  <p className="text-muted-foreground italic">
                                    {msg.streaming ? '正在思考...' : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 评分按钮 - Apple style */}
                        {scoreData && (
                          <button
                            onClick={() => setExpandedScoreRoundId(roundId)}
                            className="absolute top-4 right-4 w-10 h-10 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-apple flex items-center justify-center"
                            title={`查看第 ${roundId} 轮评分`}
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* 显示没有 roundId 的消息（如果有） - Apple style */}
                  {messagesWithoutRound.length > 0 && (
                    <div className="rounded-xl border border-warning/50 bg-warning/5 p-6">
                      <h3 className="text-sm font-semibold text-warning mb-4">其他消息</h3>
                      <div className="space-y-3">
                        {messagesWithoutRound.map((msg) => (
                          <div
                            key={msg.id}
                            className={`rounded-lg border border-border/50 bg-muted/20 p-4 ${msg.streaming ? 'animate-pulse' : ''}`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-semibold rounded px-2 py-0.5 ${
                                msg.role === 'audience'
                                  ? 'bg-audience/10 text-audience'
                                  : msg.stance === 'pro'
                                    ? 'bg-pro/10 text-pro'
                                    : 'bg-con/10 text-con'
                              }`}>
                                {msg.role === 'audience' ? '观众' : msg.stance === 'pro' ? '正方' : '反方'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </span>

                              {/* Feature: 001-voice-emotion - 语音控制按钮 */}
                              {msg.content && !msg.streaming && voiceEnabled && (
                                <div className="ml-auto">
                                  <VoiceControl
                                    messageId={parseInt(msg.id.replace(/\D/g, '')) || 0}
                                    text={msg.content}
                                    audioUrl={voicePlayback.audioUrls.get(parseInt(msg.id.replace(/\D/g, '')) || 0)}
                                    loading={voicePlayback.loading.has(parseInt(msg.id.replace(/\D/g, '')) || 0)}
                                    disabled={voicePlayback.playingMessageId !== null && voicePlayback.playingMessageId !== parseInt(msg.id.replace(/\D/g, ''))}
                                    playing={voicePlayback.playingMessageId === parseInt(msg.id.replace(/\D/g, ''))}
                                    onPlay={() => voicePlayback.playVoice(parseInt(msg.id.replace(/\D/g, '')) || 0, msg.content)}
                                    onStop={() => voicePlayback.stopVoice()}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <p className="mb-0 text-foreground">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 评分卡片弹窗 */}
      {expandedScoreRoundId !== null && scores.get(expandedScoreRoundId) && (
        <ScoreCard
          scoreData={scores.get(expandedScoreRoundId)!}
          roundId={expandedScoreRoundId}
          onClose={() => setExpandedScoreRoundId(null)}
        />
      )}
    </div>
  );
}
