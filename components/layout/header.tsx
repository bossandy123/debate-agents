/**
 * Header Component
 * 导航头部组件
 */

import Link from "next/link";

export function Header() {
  return (
    <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-950/80 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AD</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                多模型 Agent 辩论系统
              </h1>
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link
                href="/"
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
              >
                创建辩论
              </Link>
              <Link
                href="/history"
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
              >
                历史记录
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              基于 LangChain + Next.js 15
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
