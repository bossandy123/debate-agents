/**
 * History Page
 * Apple-style minimalist history page with scroll position restoration
 */

"use client";

import { useEffect } from "react";
import { Header } from "@/components/layout/header";
import { DebateHistoryList } from "@/components/debate/debate-history-list";

export default function HistoryPage() {
  useEffect(() => {
    // 恢复滚动位置
    const savedPosition = sessionStorage.getItem('history-scroll-position');
    if (savedPosition) {
      const position = parseInt(savedPosition, 10);
      window.scrollTo({ top: position, behavior: 'instant' });
    }
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-3.5rem)]">
        <div className="container mx-auto max-w-4xl px-4 py-12" id="main-content">
          <div className="space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-display-sm font-bold mb-4">历史辩论记录</h1>
              <p className="text-lg text-muted-foreground">
                查看所有历史辩论，回顾精彩论点和最终结果
              </p>
            </div>

            {/* History List */}
            <DebateHistoryList />
          </div>
        </div>
      </main>
    </>
  );
}
