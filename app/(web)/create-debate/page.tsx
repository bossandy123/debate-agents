import Link from "next/link";
import { DebateConfigForm } from "@/components/debate/debate-config-form";

export default function CreateDebatePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← 返回首页
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">创建新辩论</h1>
          <DebateConfigForm />
        </div>
      </main>
    </div>
  );
}
