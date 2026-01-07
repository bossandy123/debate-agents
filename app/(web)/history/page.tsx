/**
 * History Page (Server Component)
 * 历史记录页面 - Spatial UI Design
 */

import { Header } from "@/components/layout/header";
import { DebateHistoryList } from "@/components/debate/debate-history-list";

export default function HistoryPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="space-y-4 animate-fade-in-down">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-audience/10 border border-audience/20">
              <svg className="w-4 h-4 text-audience" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-audience">辩论档案</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
              历史<span className="gradient-text">辩论记录</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              查看所有历史辩论，回顾精彩论点和最终结果
            </p>
          </div>

          {/* History List */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <DebateHistoryList />
          </div>
        </div>
      </main>
    </>
  );
}
