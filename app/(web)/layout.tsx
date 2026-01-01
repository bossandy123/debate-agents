/**
 * Web Application Layout
 * 应用的根布局组件
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "多模型 Agent 辩论系统",
  description: "基于 LangChain 和 Next.js 的多模型 AI 辩论系统",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          {children}
        </div>
      </body>
    </html>
  );
}
