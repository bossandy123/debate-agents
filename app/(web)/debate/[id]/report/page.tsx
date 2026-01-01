/**
 * Debate Report Page
 * 辩论复盘报告页面 - 显示完整的辩论过程和结果
 */

import { Header } from "@/components/layout/header";
import { MarkdownContent } from "@/components/debate/markdown-content";
import { notFound } from "next/navigation";

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
          <main className="container mx-auto px-4 py-8">
            <div className="max-w-5xl mx-auto">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                <h1 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">获取报告失败</h1>
                <p className="text-red-600 dark:text-red-400">{error.error || '未知错误'}</p>
                <a href={`/debate/${debateId}`} className="inline-block mt-4 text-blue-600 hover:underline">
                  返回辩论页面
                </a>
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
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <h1 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">网络错误</h1>
              <p className="text-red-600 dark:text-red-400">无法连接到服务器，请检查网络连接后重试</p>
              <a href={`/debate/${debateId}`} className="inline-block mt-4 text-blue-600 hover:underline">
                返回辩论页面
              </a>
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

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* 头部 */}
            <div className="flex items-center justify-between">
              <div>
                <a href={`/debate/${debateId}`} className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-4">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  返回辩论
                </a>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{debate.topic}</h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  创建时间: {new Date(debate.created_at).toLocaleString()}
                  {debate.completed_at && ` · 完成时间: ${new Date(debate.completed_at).toLocaleString()}`}
                </p>
              </div>
            </div>

            {/* 结果概览卡片 */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white">辩论结果</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">获胜方</p>
                    <p className={`text-2xl font-bold ${
                      debate.winner === 'pro' ? 'text-blue-600 dark:text-blue-400' :
                      debate.winner === 'con' ? 'text-red-600 dark:text-red-400' :
                      'text-slate-700 dark:text-slate-300'
                    }`}>
                      {debate.winner === 'pro' ? '正方' : debate.winner === 'con' ? '反方' : '平局'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">正方总分</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{proTotal.toFixed(1)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">反方总分</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{conTotal.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 裁判总结 */}
            {judgment && (judgment.summary || judgment.comment) && (
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  裁判总结
                </h2>
                <MarkdownContent content={judgment.summary || judgment.comment} />
              </div>
            )}

            {/* 各轮次详情 */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">辩论过程回放</h2>
              {rounds.map((round: Round) => (
                <div key={round.round_id} className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border overflow-hidden">
                  {/* 轮次标题 */}
                  <div className={`px-6 py-4 ${
                    round.phase === 'opening' ? 'bg-green-100 dark:bg-green-900/30' :
                    round.phase === 'rebuttal' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                    'bg-purple-100 dark:bg-purple-900/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        第 {round.sequence} 轮
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        round.phase === 'opening' ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200' :
                        round.phase === 'rebuttal' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' :
                        'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200'
                      }`}>
                        {round.phase === 'opening' ? '立论阶段' :
                         round.phase === 'rebuttal' ? '反驳阶段' :
                         round.phase === 'closing' ? '总结阶段' : round.phase}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* 发言内容 */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">发言记录</h4>
                      <div className="space-y-4">
                        {round.messages && round.messages.length > 0 ? (
                          round.messages.map((msg: RoundMessage, msgIdx: number) => {
                            const isPro = msg.stance === 'pro';
                            const isFirstMsg = msgIdx === 0;
                            return (
                              <div
                                key={msgIdx}
                                className={`relative ${
                                  isFirstMsg ? '' : 'ml-8'
                                }`}
                              >
                                {/* 连接线 */}
                                {!isFirstMsg && (
                                  <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${
                                    isPro ? 'bg-blue-200 dark:bg-blue-800' : 'bg-red-200 dark:bg-red-800'
                                  }`} style={{ left: '-1rem' }} />
                                )}

                                <div className={`p-4 rounded-lg border-2 ${
                                  isPro
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                                }`}>
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                      isPro
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-red-500 text-white'
                                    }`}>
                                      {isPro ? '正方' : '反方'}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      {new Date(msg.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  <MarkdownContent content={msg.content} />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-slate-500 text-center py-8 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            暂无发言记录
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 评分详情 */}
                    {round.scores && round.scores.length > 0 && (
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">本轮评分</h4>
                        <div className="grid grid-cols-2 gap-6">
                          {round.scores.map((score: RoundScore) => {
                            const isPro = score.stance === 'pro';
                            return (
                              <div
                                key={score.agent_id}
                                className={`p-5 rounded-xl border-2 ${
                                  isPro
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <h5 className={`font-bold ${isPro ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>
                                    {isPro ? '正方' : '反方'}
                                  </h5>
                                  <span className={`text-3xl font-bold ${isPro ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {score.total}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">逻辑性</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                        <div
                                          className={`h-2 rounded-full ${isPro ? 'bg-blue-500' : 'bg-red-500'}`}
                                          style={{ width: `${(score.logic / 10) * 100}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-medium w-6 text-right">{score.logic}</span>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">反驳能力</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                        <div
                                          className={`h-2 rounded-full ${isPro ? 'bg-blue-500' : 'bg-red-500'}`}
                                          style={{ width: `${(score.rebuttal / 10) * 100}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-medium w-6 text-right">{score.rebuttal}</span>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">清晰度</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                        <div
                                          className={`h-2 rounded-full ${isPro ? 'bg-blue-500' : 'bg-red-500'}`}
                                          style={{ width: `${(score.clarity / 10) * 100}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-medium w-6 text-right">{score.clarity}</span>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">论据充分性</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                        <div
                                          className={`h-2 rounded-full ${isPro ? 'bg-blue-500' : 'bg-red-500'}`}
                                          style={{ width: `${(score.evidence / 10) * 100}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-medium w-6 text-right">{score.evidence}</span>
                                    </div>
                                  </div>
                                </div>
                                {score.comment && (
                                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <MarkdownContent content={`"${score.comment}"`} className="text-xs text-slate-600 dark:text-slate-400 italic" />
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
              ))}
            </div>

            {/* 底部导航 */}
            <div className="flex justify-center gap-4 pt-8">
              <a
                href={`/debate/${debateId}`}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              >
                返回辩论观看
              </a>
              <a
                href="/history"
                className="px-6 py-3 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                查看历史记录
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
