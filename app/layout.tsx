import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "多模型 Agent 辩论系统",
  description: "基于 LangChain 的多模型 AI 辩论平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
