import { Header } from "@/components/layout/header";
import { DebateConfigForm } from "@/components/debate/debate-config-form";

export default function CreateDebatePage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-4 animate-fade-in-down">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-sm font-medium text-primary">AI 驱动的智能辩论</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
              创建<span className="gradient-text">新辩论</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
              配置多模型 Agent 进行深度辩论，探索复杂话题的多维视角
            </p>
          </div>

          {/* Form Card */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <DebateConfigForm />
          </div>
        </div>
      </main>
    </>
  );
}
