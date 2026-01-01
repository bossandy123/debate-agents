/**
 * Debate Viewer Page
 * 辩论观看页面 - 实时观看辩论进程
 */

import { Header } from "@/components/layout/header";
import { DebatePageWrapper } from "@/components/debate/debate-page-wrapper";
import { notFound } from "next/navigation";

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
            <DebatePageWrapper
              debateId={debateId}
              initialStatus={debate.status}
              topic={debate.topic}
              proDefinition={debate.pro_definition}
              conDefinition={debate.con_definition}
              maxRounds={debate.max_rounds}
            />
          </div>
        </main>
      </>
    );
  } catch (error) {
    console.error('Failed to fetch debate:', error);
    notFound();
  }
}
