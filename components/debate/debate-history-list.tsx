/**
 * Debate History List Component
 * 辩论历史列表组件
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

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
    const statusMap: Record<string, { label: string; className: string }> = {
      completed: { label: '已完成', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
      running: { label: '进行中', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
      failed: { label: '失败', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
      pending: { label: '等待中', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    };
    const statusInfo = statusMap[status] || statusMap.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getWinnerLabel = (winner?: string) => {
    if (!winner) return '-';
    if (winner === 'draw') return '平局';
    if (winner === 'pro') return '正方胜';
    if (winner === 'con') return '反方胜';
    return winner;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-slate-600 dark:text-slate-400">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (debates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-slate-400">暂无历史记录</p>
        <Link
          href="/create-debate"
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          创建第一个辩论
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
        {debates.map((debate) => (
          <div
            key={debate.id}
            className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{debate.topic}</h3>
                  {getStatusBadge(debate.status)}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <p>辩论轮数: {debate.max_rounds} 轮</p>
                  {debate.winner && <p>胜方: {getWinnerLabel(debate.winner)}</p>}
                  <p>创建时间: {new Date(debate.created_at).toLocaleString()}</p>
                  {debate.completed_at && (
                    <p>完成时间: {new Date(debate.completed_at).toLocaleString()}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {debate.status === 'running' && (
                  <Link
                    href={`/debate/${debate.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    观看辩论
                  </Link>
                )}
                {debate.status === 'completed' && (
                  <>
                    <Link
                      href={`/debate/${debate.id}`}
                      className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm"
                    >
                      回放
                    </Link>
                    <Link
                      href={`/api/debates/${debate.id}/export`}
                      target="_blank"
                      className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                    >
                      导出
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
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg shadow-sm border p-4">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            {/* 上一页 */}
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>

            {/* 页码 */}
            <div className="flex gap-1">
              {getPageNumbers().map((pageNum, index) => (
                <button
                  key={index}
                  onClick={() => typeof pageNum === 'number' && handlePageChange(pageNum)}
                  disabled={pageNum === '...'}
                  className={`min-w-[2.5rem] px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                    pageNum === pagination.page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
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
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
