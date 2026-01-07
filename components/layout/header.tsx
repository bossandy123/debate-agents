/**
 * Header Component
 * 导航头部组件 - Spatial UI Design
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "创建辩论" },
    { href: "/history", label: "历史记录" },
  ];

  return (
    <header className="sticky top-4 z-50 mx-4 md:mx-8 lg:mx-auto lg:max-w-7xl">
      <nav className="glass-card-elevated rounded-2xl px-6 py-3 md:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-pro to-audience rounded-xl blur-sm opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
              <div className="relative w-10 h-10 bg-gradient-to-br from-primary via-pro to-audience rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-base">AD</span>
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary via-pro to-audience bg-clip-text text-transparent leading-tight">
                多模型 Agent 辩论系统
              </h1>
              <span className="text-xs text-muted-foreground hidden sm:block">
                AI-Powered Debates
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ease-out-expo",
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"></span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </header>
  );
}
