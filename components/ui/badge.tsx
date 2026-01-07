import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "pro" | "con" | "audience" | "success" | "warning" | "destructive";
  size?: "sm" | "md";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const variants = {
      default: "bg-secondary text-secondary-foreground border border-border/50",
      pro: "bg-pro/10 text-pro border border-pro/20",
      con: "bg-con/10 text-con border border-con/20",
      audience: "bg-audience/10 text-audience border border-audience/20",
      success: "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
      warning: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20",
      destructive: "bg-destructive/10 text-destructive border border-destructive/20",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-3 py-1 text-xs",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full font-medium transition-all duration-300 ease-out-expo",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
