/**
 * Debate History List Component
 * 辩论历史列表组件 - Spatial UI Design
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Debate {
  id: number;
  topic: string;
  status: string;
  winner?: string;
  max_rounds: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function DebateHistoryList() {
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchDebates = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/debates?page=${page}&limit=20`);
      if (!res.ok) {
        throw new Error('获取历史记录失败');
      }
      const data = await res.json();
      setDebates(data.debates || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取历史记录失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDebates(1);
  }, [fetchDebates]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchDebates(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "default" }> = {
      completed: { label: '已完成', variant: 'success' },
      running: { label: '进行中', variant: 'warning' },
      failed: { label: '失败', variant: 'destructive' },
      pending: { label: '等待中', variant: 'default' },
    };
    const statusInfo = statusMap[status] || statusMap.pending;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getWinnerLabel = (winner?: string) => {
    if (!winner) return '-';
    if (winner === 'draw') return '平局';
    if (winner === 'pro') return '正方胜';
    if (winner === 'con') return '反方胜';
    return winner;
  };

  const getWinnerBadge = (winner?: string) => {
    if (!winner) return null;
    if (winner === 'draw') return <Badge variant="default">平局</Badge>;
    if (winner === 'pro') return <Badge variant="pro">正方胜</Badge>;
    if (winner === 'con') return <Badge variant="con">反方胜</Badge>;
    return null;
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-border/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-6 text-muted-foreground font-medium">加载历史记录中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 border border-destructive/50 bg-destructive/10 rounded-3xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-destructive mb-1">加载失败</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchDebates(pagination.page)}
            className="shrink-0"
          >
            重试
          </Button>
        </div>
      </div>
    );
  }

  if (debates.length === 0) {
    return (
      <div className="glass-card-elevated rounded-3xl p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted/50 flex items-center justify-center">
          <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2">暂无历史记录</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          创建你的第一个辩论，开始 AI 驱动的智能辩论体验
        </p>
        <Link href="/create-debate">
          <Button size="lg" className="shadow-glow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建第一个辩论
          </Button>
        </Link>
      </div>
    );
  }

  // 生成页码列表
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const { page, totalPages } = pagination;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {debates.map((debate, index) => (
          <div
            key={debate.id}
            className="glass-card rounded-2xl p-6 hover-lift cursor-pointer animate-fade-in-up"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <Link
                    href={`/debate/${debate.id}`}
                    className="text-xl font-semibold hover:text-primary transition-colors line-clamp-2"
                  >
                    {debate.topic}
                  </Link>
                  {getStatusBadge(debate.status)}
                  {getWinnerBadge(debate.winner)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">辩论轮数</p>
                    <p className="font-medium">{debate.max_rounds} 轮</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">创建时间</p>
                    <p className="font-medium">{new Date(debate.created_at).toLocaleDateString()}</p>
                  </div>
                  {debate.started_at && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground">开始时间</p>
                      <p className="font-medium">{new Date(debate.started_at).toLocaleDateString()}</p>
                    </div>
                  )}
                  {debate.completed_at && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground">完成时间</p>
                      <p className="font-medium">{new Date(debate.completed_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                {debate.status === 'running' && (
                  <Link href={`/debate/${debate.id}`} className="w-full sm:w-auto">
                    <Button className="shadow-glow-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      观看辩论
                    </Button>
                  </Link>
                )}
                {debate.status === 'completed' && (
                  <>
                    <Link href={`/debate/${debate.id}`} className="w-full sm:w-auto">
                      <Button variant="outline">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        回放
                      </Button>
                    </Link>
                    <Link
                      href={`/api/debates/${debate.id}/export`}
                      target="_blank"
                      className="w-full sm:w-auto"
                    >
                      <Button variant="ghost">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        导出
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 分页控件 */}
      {pagination.totalPages > 1 && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              共 <span className="font-semibold text-foreground">{pagination.total}</span> 条记录，
              第 <span className="font-semibold text-foreground">{pagination.page}</span> / {pagination.totalPages} 页
            </div>

            <div className="flex items-center gap-2">
              {/* 上一页 */}
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                上一页
              </button>

              {/* 页码 */}
              <div className="flex gap-1">
                {getPageNumbers().map((pageNum, index) => (
                  <button
                    key={index}
                    onClick={() => typeof pageNum === 'number' && handlePageChange(pageNum)}
                    disabled={pageNum === '...'}
                    className={`min-w-[2.5rem] h-10 px-3 text-sm font-medium rounded-xl transition-all active:scale-95 ${
                      pageNum === pagination.page
                        ? 'bg-primary text-primary-foreground shadow-glow-sm'
                        : 'border border-border hover:bg-muted'
                    } ${pageNum === '...' ? 'cursor-default' : ''}`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              {/* 下一页 */}
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-xl border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                下一页
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
