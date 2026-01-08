/**
 * Debate Page Wrapper
 * Apple-style minimalist design
 * 管理启动/停止状态，展示辩论元信息
 */

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { DebateViewer } from "./debate-viewer";
import { StartDebateButton } from "./start-debate-button";
import { StopDebateButton } from "./stop-debate-button";
import { Badge } from "@/components/ui/badge";

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
    setStatus("running");
  }, []);

  const handleStopped = useCallback(() => {
    setStatus("failed");
  }, []);

  const getStatusInfo = () => {
    switch (status) {
      case 'completed':
        return { label: '已完成', variant: 'success' as const };
      case 'running':
        return { label: '进行中', variant: 'warning' as const };
      case 'failed':
        return { label: '失败', variant: 'destructive' as const };
      default:
        return { label: '等待中', variant: 'default' as const };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回历史记录
        </Link>
      </div>

      {/* Header Section - Apple style */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Topic & Status */}
          <div className="flex-1 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-semibold tracking-tight">{topic}</h1>
                <Badge variant={statusInfo.variant} className="shrink-0">
                  {statusInfo.label}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${status === 'running' ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
                  <span>辩论 ID: #{debateId}</span>
                </div>
                <span>·</span>
                <span>最多 {maxRounds} 轮</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
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
      </div>

      {/* Stance Definitions - Apple style */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Pro Stance */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-pro/5 border border-pro/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-pro/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-base font-semibold text-foreground">正方立场</h3>
                <p className="text-xs text-muted-foreground">Pro Position</p>
              </div>
            </div>
            <p className="text-sm text-foreground/70 leading-relaxed">{proDefinition}</p>
          </div>
        </div>

        {/* Con Stance */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-con/5 border border-con/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-con/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-base font-semibold text-foreground">反方立场</h3>
                <p className="text-xs text-muted-foreground">Con Position</p>
              </div>
            </div>
            <p className="text-sm text-foreground/70 leading-relaxed">{conDefinition}</p>
          </div>
        </div>
      </div>

      {/* Debate Viewer */}
      <DebateViewer
        debateId={debateId}
        initialStatus={status}
        maxRounds={maxRounds}
      />
    </div>
  );
}
