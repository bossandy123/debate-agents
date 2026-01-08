/**
 * Report Page Client Wrapper
 * 不需要滚动位置恢复，报告页面总是从顶部开始
 */

"use client";

interface ReportPageClientProps {
  children: React.ReactNode;
}

export function ReportPageClient({ children }: ReportPageClientProps) {
  return <>{children}</>;
}
