import { Header } from "@/components/layout/header";
import { DebateConfigForm } from "@/components/debate/debate-config-form";

export default function CreateDebatePage() {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-3.5rem)]">
        <div className="container mx-auto max-w-3xl px-4 py-12">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-display-sm font-bold mb-4">创建新辩论</h1>
            <p className="text-lg text-muted-foreground">
              配置多模型 Agent 进行深度辩论，探索复杂话题的多维视角
            </p>
          </div>

          {/* Form */}
          <DebateConfigForm />
        </div>
      </main>
    </>
  );
}
