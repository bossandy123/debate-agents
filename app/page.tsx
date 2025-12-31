import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">多模型 Agent 辩论系统</h1>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold">基于 LangChain 的多模型 AI 辩论平台</h2>
            <p className="text-muted-foreground text-lg">
              支持多种 LLM 模型进行结构化辩论，实时观看，智能裁决
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Link
              href="/create-debate"
              className="block p-6 border rounded-lg hover:bg-accent transition-colors"
            >
              <h3 className="text-xl font-semibold mb-2">创建辩论</h3>
              <p className="text-muted-foreground">
                配置辩题、选择模型、设置观众权重，启动一场新的辩论
              </p>
            </Link>

            <Link
              href="/history"
              className="block p-6 border rounded-lg hover:bg-accent transition-colors"
            >
              <h3 className="text-xl font-semibold mb-2">历史记录</h3>
              <p className="text-muted-foreground">
                查看所有历史辩论记录、复盘报告和详细分析
              </p>
            </Link>

            <div className="block p-6 border rounded-lg">
              <h3 className="text-xl font-semibold mb-2">实时观看</h3>
              <p className="text-muted-foreground">
                通过 SSE 实时流式输出观看 Agent 辩论过程
              </p>
            </div>
          </div>

          <div className="border-t pt-8">
            <h3 className="text-xl font-semibold mb-4">功能特性</h3>
            <ul className="grid md:grid-cols-2 gap-4 text-muted-foreground">
              <li>✓ 支持 OpenAI、Claude、Gemini、DeepSeek 等多种模型</li>
              <li>✓ 10 轮结构化辩论流程（开篇、反驳、总结）</li>
              <li>✓ 智能 Agent 裁判评分系统</li>
              <li>✓ 多类型观众 Agent 投票</li>
              <li>✓ 实时 SSE 流式输出</li>
              <li>✓ 完整的复盘报告生成</li>
              <li>✓ SQLite 数据持久化</li>
              <li>✓ LangChain Agent 框架</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
