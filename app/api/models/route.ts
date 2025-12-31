import { NextResponse } from "next/server";
import { getAvailableModels } from "@/lib/langchain/config";

export const runtime = "nodejs";

/**
 * GET /api/models - 获取可用模型列表
 */
export async function GET() {
  try {
    const models = getAvailableModels();

    // 按提供商分组
    const grouped = models.reduce((acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    }, {} as Record<string, typeof models>);

    return NextResponse.json({
      providers: Object.entries(grouped).map(([provider, models]) => ({
        id: provider,
        name: provider.charAt(0).toUpperCase() + provider.slice(1),
        models,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "获取模型列表失败",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
