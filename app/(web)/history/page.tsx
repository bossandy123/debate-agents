/**
 * History Page (Server Component)
 * 历史记录页面
 */

import { Header } from "@/components/layout/header";
import { DebateHistoryList } from "@/components/debate/debate-history-list";

export default function HistoryPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">历史辩论记录</h1>
          <DebateHistoryList />
        </div>
      </main>
    </>
  );
}
