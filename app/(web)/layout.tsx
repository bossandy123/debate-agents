/**
 * Web Application Layout
 * 应用的根布局组件
 */

import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function WebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={inter.className + " min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900"}>
      {children}
    </div>
  );
}
