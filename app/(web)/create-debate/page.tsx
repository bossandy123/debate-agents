import { Header } from "@/components/layout/header";
import { DebateConfigForm } from "@/components/debate/debate-config-form";

export default function CreateDebatePage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">创建新辩论</h1>
          <DebateConfigForm />
        </div>
      </main>
    </>
  );
}
