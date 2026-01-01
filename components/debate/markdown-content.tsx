/**
 * Markdown Content Component
 * Markdown 内容渲染组件
 */

"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          p: ({ children }) => <p className="mb-0 text-slate-700 dark:text-slate-300">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-slate-700 dark:text-slate-300">{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-slate-900 dark:text-slate-100">{children}</strong>,
          em: ({ children }) => <em className="italic text-slate-700 dark:text-slate-300">{children}</em>,
          code: ({ className, children }) => {
            const isInline = !className?.includes('language-');
            return isInline ? (
              <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-mono text-purple-700 dark:text-purple-300">{children}</code>
            ) : (
              <code className="block p-3 bg-slate-900 dark:bg-slate-950 rounded-lg text-xs font-mono text-green-400 overflow-x-auto">{children}</code>
            );
          },
          blockquote: ({ children }) => <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-600 dark:text-slate-400">{children}</blockquote>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
