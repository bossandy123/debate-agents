/**
 * Home Page
 * Apple-style minimalist landing page
 */

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-3.5rem)]">
        {/* Hero Section */}
        <section className="container mx-auto max-w-5xl px-4 py-24 md:py-32">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="font-medium text-primary">AI 驱动的智能辩论系统</span>
            </div>

            {/* Heading */}
            <h1 className="text-display-md md:text-display-lg font-bold tracking-tight">
              探索<span className="text-primary">智能辩论</span>的无限可能
            </h1>

            {/* Subtitle */}
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              让多个 AI Agent 为你呈现精彩的观点交锋，从多角度深度剖析复杂议题
            </p>

            {/* CTA */}
            <div className="flex flex-col items-center justify-center gap-3 pt-4 sm:flex-row">
              <Link href="/create-debate">
                <Button size="lg" className="min-w-[160px]">
                  创建新辩论
                </Button>
              </Link>
              <Link href="/history">
                <Button variant="secondary" size="lg" className="min-w-[160px]">
                  浏览历史记录
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t border-border/40 bg-muted/30">
          <div className="container mx-auto max-w-5xl px-4 py-24">
            <div className="mb-12 text-center">
              <h2 className="text-display-sm font-bold mb-4">核心功能</h2>
              <p className="text-lg text-muted-foreground">
                全面的 AI 辩论平台，为您提供智能化的辩论体验
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Feature 1 */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-pro/10">
                  <svg className="h-5 w-5 text-pro" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="mb-2 font-semibold">多模型辩论</h3>
                <p className="text-sm text-muted-foreground">
                  支持多个 AI 模型同时参与辩论，包括 OpenAI、Anthropic、Google 等主流模型
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-con/10">
                  <svg className="h-5 w-5 text-con" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mb-2 font-semibold">智能裁判系统</h3>
                <p className="text-sm text-muted-foreground">
                  独立的 AI 裁判客观评判辩论质量，从逻辑性、反驳力、清晰度等多维度打分
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-audience/10">
                  <svg className="h-5 w-5 text-audience" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 0112.728 0" />
                  </svg>
                </div>
                <h3 className="mb-2 font-semibold">语音播放功能</h3>
                <p className="text-sm text-muted-foreground">
                  支持 TTS 语音合成，让辩论内容生动呈现，提供沉浸式的聆听体验
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section>
          <div className="container mx-auto max-w-5xl px-4 py-24">
            <div className="mb-12 text-center">
              <h2 className="text-display-sm font-bold mb-4">如何使用</h2>
              <p className="text-lg text-muted-foreground">简单三步，开启智能辩论之旅</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {/* Step 1 */}
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-lg font-bold">1</span>
                </div>
                <h3 className="mb-2 font-semibold">配置辩论</h3>
                <p className="text-sm text-muted-foreground">
                  设置辩题、选择 AI 模型、定义正反方立场
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-pro text-pro-foreground">
                  <span className="text-lg font-bold">2</span>
                </div>
                <h3 className="mb-2 font-semibold">启动辩论</h3>
                <p className="text-sm text-muted-foreground">
                  AI Agent 开始激烈辩论，实时呈现精彩观点
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-audience text-audience-foreground">
                  <span className="text-lg font-bold">3</span>
                </div>
                <h3 className="mb-2 font-semibold">查看报告</h3>
                <p className="text-sm text-muted-foreground">
                  获取详细辩论报告和裁判评分结果
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-border/40 bg-muted/30">
          <div className="container mx-auto max-w-3xl px-4 py-24 text-center">
            <h2 className="text-display-sm font-bold mb-4">准备好开始了吗？</h2>
            <p className="mb-8 text-xl text-muted-foreground">
              立即创建你的第一个 AI 辩论，体验智能交锋的精彩
            </p>
            <Link href="/create-debate">
              <Button size="lg">立即开始</Button>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
