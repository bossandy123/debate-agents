/**
 * Debate Viewer Page
 * 辩论观看页面 - 实时观看辩论进程
 */

import { Header } from "@/components/layout/header";
import { DebateViewer } from "@/components/debate/debate-viewer";
import { notFound } from "next/navigation";
import { StartDebateButton } from "@/components/debate/start-debate-button";
import { StopDebateButton } from "@/components/debate/stop-debate-button";

interface DebateViewerPageProps {
  params: Promise<{ id: string }>;
}

export default async function DebateViewerPage({ params }: DebateViewerPageProps) {
  const { id } = await params;
  const debateId = parseInt(id);

  if (isNaN(debateId)) {
    notFound();
  }

  // 验证辩论是否存在
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/debates/${debateId}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      notFound();
    }

    const debate = await response.json();

    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{debate.topic}</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  状态: <span className={`font-medium ${
                    debate.status === 'completed' ? 'text-green-600' :
                    debate.status === 'running' ? 'text-blue-600' :
                    debate.status === 'failed' ? 'text-red-600' :
                    'text-slate-600'
                  }`}>
                    {debate.status === 'completed' ? '已完成' :
                     debate.status === 'running' ? '进行中' :
                     debate.status === 'failed' ? '失败' :
                     '等待中'}
                  </span>
                </p>
              </div>
              <div className="flex gap-3">
                {debate.status === 'pending' && (
                  <StartDebateButton debateId={debateId} />
                )}
                {debate.status === 'running' && (
                  <StopDebateButton debateId={debateId} />
                )}
              </div>
            </div>
            <DebateViewer debateId={debateId} initialStatus={debate.status} />
          </div>
        </main>
      </>
    );
  } catch (error) {
    console.error('Failed to fetch debate:', error);
    notFound();
  }
}
