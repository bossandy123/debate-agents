/**
 * GET /api/debates/[id]/stream
 * SSE 实时推送端点
 */

import { NextRequest } from "next/server";
import { sseService, createSSEStream } from "@/lib/services/sse-service";
import { debateRepository } from "@/lib/repositories/debate.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const debateId = parseInt(id);

  if (isNaN(debateId)) {
    return new Response(
      `data: ${JSON.stringify({
        type: "error",
        data: { error: "无效的辩论 ID", code: "INVALID_DEBATE_ID" },
        timestamp: new Date().toISOString(),
      })}\n\n`,
      {
        status: 400,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }

  // 检查辩论是否存在
  const debate = debateRepository.findById(debateId);
  if (!debate) {
    return new Response(
      `data: ${JSON.stringify({
        type: "error",
        data: { error: "辩论不存在", code: "DEBATE_NOT_FOUND" },
        timestamp: new Date().toISOString(),
      })}\n\n`,
      {
        status: 404,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }

  // 创建 SSE 流
  const stream = createSSEStream((listener) => {
    // 订阅辩论事件
    return sseService.subscribe(debateId, listener);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // 禁用 Nginx 缓冲
    },
  });
}
