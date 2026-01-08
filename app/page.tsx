/**
 * Home Page
 * 首页 - Spatial UI Design with Particle Animation
 */

"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

function ParticleBackground() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number; delay: number }>>([]);

  useEffect(() => {
    // Generate random particles
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * -20,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Animated gradient mesh */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-30 dark:opacity-20"></div>

      {/* Floating orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-float"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-audience/20 rounded-full blur-[128px] animate-float" style={{ animationDelay: "2s" }}></div>

      {/* Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-white/40 dark:bg-white/20 animate-particle-float"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/50"></div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <ParticleBackground />
      <Header />
      <main className="relative container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center space-y-8 py-16 md:py-24">
            {/* Animated Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 animate-fade-in-down">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-sm font-medium text-primary">AI-Powered Intelligent Debates</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              探索<span className="gradient-text">智能辩论</span>
              <br />
              的无限可能
            </h1>

            {/* Description */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              让多个 AI Agent 为你呈现精彩的观点交锋，
              <br className="hidden md:block" />
              从多角度深度剖析复杂议题
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <Link href="/create-debate" className="w-full sm:w-auto">
                <Button size="lg" className="text-lg px-8 py-6 shadow-glow-sm h-14">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  创建新辩论
                </Button>
              </Link>
              <Link href="/history" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="text-lg px-8 py-6 h-14">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  浏览历史记录
                </Button>
              </Link>
            </div>
          </div>

          {/* Features Section */}
          <div className="grid md:grid-cols-3 gap-6 py-16 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            {/* Feature 1 */}
            <div className="glass-card rounded-3xl p-8 hover-lift">
              <div className="w-14 h-14 rounded-2xl bg-pro/10 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-pro" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">多模型辩论</h3>
              <p className="text-muted-foreground leading-relaxed">
                支持多个 AI 模型同时参与辩论，包括 OpenAI、Anthropic、Google 等主流模型
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card rounded-3xl p-8 hover-lift" style={{ animationDelay: "0.5s" }}>
              <div className="w-14 h-14 rounded-2xl bg-con/10 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-con" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">智能裁判系统</h3>
              <p className="text-muted-foreground leading-relaxed">
                独立的 AI 裁判客观评判辩论质量，从逻辑性、反驳力、清晰度等多维度打分
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card rounded-3xl p-8 hover-lift" style={{ animationDelay: "0.6s" }}>
              <div className="w-14 h-14 rounded-2xl bg-audience/10 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-audience" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 0112.728 0" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">语音播放功能</h3>
              <p className="text-muted-foreground leading-relaxed">
                支持 TTS 语音合成，让辩论内容生动呈现，提供沉浸式的聆听体验
              </p>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="py-16 space-y-12 animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">如何使用</h2>
              <p className="text-lg text-muted-foreground">简单三步，开启智能辩论之旅</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="relative">
                <div className="glass-card-elevated rounded-3xl p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-pro flex items-center justify-center mx-auto mb-6 shadow-glow-sm">
                    <span className="text-2xl font-bold text-white">1</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">配置辩论</h3>
                  <p className="text-muted-foreground">
                    设置辩题、选择 AI 模型、定义正反方立场
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary to-transparent"></div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="glass-card-elevated rounded-3xl p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pro to-audience flex items-center justify-center mx-auto mb-6 shadow-glow-sm">
                    <span className="text-2xl font-bold text-white">2</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">启动辩论</h3>
                  <p className="text-muted-foreground">
                    AI Agent 开始激烈辩论，实时呈现精彩观点
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-audience to-transparent"></div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="glass-card-elevated rounded-3xl p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-audience to-primary flex items-center justify-center mx-auto mb-6 shadow-glow-sm">
                    <span className="text-2xl font-bold text-white">3</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">查看报告</h3>
                  <p className="text-muted-foreground">
                    获取详细辩论报告和裁判评分结果
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="py-16 animate-fade-in-up" style={{ animationDelay: "0.8s" }}>
            <div className="glass-card-elevated rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
              {/* Background Decoration */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-pro/5 to-audience/5"></div>
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[96px]"></div>
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-audience/20 rounded-full blur-[96px]"></div>

              {/* Content */}
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  准备好开始了吗？
                </h2>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  立即创建你的第一个 AI 辩论，体验智能交锋的精彩
                </p>
                <Link href="/create-debate">
                  <Button size="lg" className="text-lg px-10 py-6 shadow-glow h-14">
                    立即开始
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
