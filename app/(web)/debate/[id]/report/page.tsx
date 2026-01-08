/**
 * Debate Report Page
 * Apple-style minimalist report design
 */

import { Header } from "@/components/layout/header";
import { MarkdownContent } from "@/components/debate/markdown-content";
import { VoiceSettingsButton } from "@/components/voice";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import Link from "next/link";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

interface RoundMessage {
  agent_id: string;
  stance?: string;
  content: string;
  created_at: string;
}

interface RoundScore {
  agent_id: string;
  stance?: string;
  logic: number;
  rebuttal: number;
  clarity: number;
  evidence: number;
  total: number;
  comment?: string;
}

interface Round {
  round_id: number;
  sequence: number;
  phase: string;
  messages: RoundMessage[];
  scores: RoundScore[];
}

export default async function DebateReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const debateId = parseInt(id);

  if (isNaN(debateId)) {
    notFound();
  }

  // 获取报告数据
  let reportData;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/debates/${debateId}/report`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json();
      return (
        <>
          <Header />
          <main className="min-h-[calc(100vh-3.5rem)]">
            <div className="container mx-auto max-w-3xl px-4 py-12">
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-lg font-medium mb-2">获取报告失败</p>
                <p className="text-sm text-muted-foreground mb-6">{error.error || '未知错误'}</p>
                <Link href={`/debate/${debateId}`}>
                  <button className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    返回辩论
                  </button>
                </Link>
              </div>
            </div>
          </main>
        </>
      );
    }

    reportData = await response.json();
  } catch {
    return (
      <>
        <Header />
        <main className="min-h-[calc(100vh-3.5rem)]">
          <div className="container mx-auto max-w-3xl px-4 py-12">
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-lg font-medium mb-2">网络错误</p>
              <p className="text-sm text-muted-foreground mb-6">无法连接到服务器，请检查网络连接后重试</p>
              <Link href={`/debate/${debateId}`}>
                <button className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  返回辩论
                </button>
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  const { debate, judgment, rounds } = reportData;

  // 使用最终评分（包含裁判评分和观众投票的加权结果）
  const proTotal = judgment?.final_scores?.pro || 0;
  const conTotal = judgment?.final_scores?.con || 0;

  const getWinnerBadge = () => {
    if (debate.winner === 'pro') return <Badge variant="pro">正方胜</Badge>;
    if (debate.winner === 'con') return <Badge variant="con">反方胜</Badge>;
    return <Badge variant="default">平局</Badge>;
  };

  const getPhaseInfo = (phase: string) => {
    switch (phase) {
      case 'opening':
        return { label: '立论阶段', bg: 'bg-green-500/10 text-green-700 dark:text-green-400' };
      case 'rebuttal':
        return { label: '反驳阶段', bg: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' };
      case 'closing':
        return { label: '总结阶段', bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' };
      default:
        return { label: phase, bg: 'bg-muted text-muted-foreground' };
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-3.5rem)] bg-muted/30">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4">
                <Link
                  href={`/debate/${debateId}`}
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  返回辩论
                </Link>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-semibold tracking-tight">{debate.topic}</h1>
                    {getWinnerBadge()}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(debate.created_at).toLocaleDateString()}
                    {debate.completed_at && ` · 完成于 ${new Date(debate.completed_at).toLocaleDateString()}`}
                  </p>
                </div>
                <VoiceSettingsButton userId={`report-${debateId}`} />
              </div>
            </div>

            {/* Results Overview */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold mb-6">辩论结果</h2>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">获胜方</p>
                  <p className={`text-xl font-semibold ${
                    debate.winner === 'pro' ? 'text-pro' :
                    debate.winner === 'con' ? 'text-con' :
                    'text-foreground'
                  }`}>
                    {debate.winner === 'pro' ? '正方' : debate.winner === 'con' ? '反方' : '平局'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">正方总分</p>
                  <p className="text-xl font-semibold text-pro">{proTotal.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">反方总分</p>
                  <p className="text-xl font-semibold text-con">{conTotal.toFixed(1)}</p>
                </div>
              </div>
            </div>

            {/* Judge Summary */}
            {judgment && (judgment.summary || judgment.comment) && (
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">裁判总结</h2>
                <div className="prose prose-slate dark:prose-invert max-w-none text-sm">
                  <MarkdownContent content={judgment.summary || judgment.comment} />
                </div>
              </div>
            )}

            {/* Debate Rounds */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">辩论过程回放</h2>
              <div className="space-y-4">
                {rounds.map((round: Round) => {
                  const phaseInfo = getPhaseInfo(round.phase);
                  return (
                    <div key={round.round_id} className="rounded-xl border border-border bg-card overflow-hidden">
                      {/* Round Header */}
                      <div className="border-b border-border px-6 py-4 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">第 {round.sequence} 轮</span>
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${phaseInfo.bg}`}>
                              {phaseInfo.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 space-y-6">
                        {/* Messages */}
                        {round.messages && round.messages.length > 0 && (
                          <div className="space-y-4">
                            {round.messages.map((msg: RoundMessage, msgIdx: number) => {
                              const isPro = msg.stance === 'pro';
                              return (
                                <div key={msgIdx} className="rounded-lg border border-border/50 bg-muted/20 p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className={`text-xs font-semibold rounded px-2 py-0.5 ${
                                      isPro ? 'bg-pro/10 text-pro' : 'bg-con/10 text-con'
                                    }`}>
                                      {isPro ? '正方' : '反方'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(msg.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="prose prose-slate dark:prose-invert max-w-none text-sm">
                                    <MarkdownContent content={msg.content} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Scores */}
                        {round.scores && round.scores.length > 0 && (
                          <div className="border-t border-border/50 pt-6">
                            <h4 className="text-sm font-medium mb-4">本轮评分</h4>
                            <div className="grid sm:grid-cols-2 gap-4">
                              {round.scores.map((score: RoundScore) => {
                                const isPro = score.stance === 'pro';
                                return (
                                  <div key={score.agent_id} className="rounded-lg border border-border/50 bg-muted/20 p-4">
                                    <div className="flex items-center justify-between mb-4">
                                      <span className={`font-semibold ${isPro ? 'text-pro' : 'text-con'}`}>
                                        {isPro ? '正方' : '反方'}
                                      </span>
                                      <span className={`text-2xl font-bold ${isPro ? 'text-pro' : 'text-con'}`}>
                                        {score.total}
                                      </span>
                                    </div>

                                    {/* Score Bars */}
                                    <div className="space-y-2">
                                      {[
                                        { label: '逻辑性', value: score.logic },
                                        { label: '反驳能力', value: score.rebuttal },
                                        { label: '清晰度', value: score.clarity },
                                        { label: '论据充分性', value: score.evidence },
                                      ].map((item) => (
                                        <div key={item.label} className="space-y-1">
                                          <div className="flex justify-between items-center text-xs">
                                            <span className="text-muted-foreground">{item.label}</span>
                                            <span className="font-medium">{item.value}</span>
                                          </div>
                                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full ${isPro ? 'bg-pro/80' : 'bg-con/80'}`}
                                              style={{ width: `${(item.value / 10) * 100}%` }}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {score.comment && (
                                      <div className="mt-3 pt-3 border-t border-border/50">
                                        <MarkdownContent content={score.comment} className="text-xs text-muted-foreground italic" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link href={`/debate/${debateId}`} className="w-full sm:w-auto">
                <button className="w-full rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium hover:bg-muted/50 transition-apple">
                  返回辩论观看
                </button>
              </Link>
              <Link href="/history" className="w-full sm:w-auto">
                <button className="w-full rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium hover:bg-muted/50 transition-apple">
                  查看历史记录
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
