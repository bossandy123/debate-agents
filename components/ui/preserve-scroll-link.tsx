/**
 * Preserve Scroll Link Component
 * 从历史记录点击进入时保存当前位置，返回时恢复
 * 辩论/报告页面总是从顶部开始
 */

"use client";

import Link from "next/link";
import { MouseEvent, ReactNode } from "react";

interface PreserveScrollLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  [key: string]: any;
}

export function PreserveScrollLink({ href, children, className, ...props }: PreserveScrollLinkProps) {
  const handleClick = (_e: MouseEvent<HTMLAnchorElement>) => {
    // 只在历史记录页面点击时保存滚动位置
    // 这样返回时可以恢复到原来的位置
    if (window.location.pathname === '/history') {
      const currentPosition = window.scrollY;
      sessionStorage.setItem('history-scroll-position', currentPosition.toString());
    }

    // 点击进入新页面时，Next.js 会自动滚动到顶部（默认行为）
    // 让默认的 Link 行为继续
  };

  return (
    <Link href={href} className={className} {...props} onClick={handleClick}>
      {children}
    </Link>
  );
}
