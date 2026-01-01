/**
 * POST /api/debates/[id]/stop
 * 停止辩论 API 端点
 */

import { NextRequest, NextResponse } from "next/server";
import { debateService } from "@/lib/services/debate-service";
import { debateRepository } from "@/lib/repositories/debate.repository";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const debateId = parseInt(id);

    if (isNaN(debateId)) {
      return NextResponse.json(
        { error: "无效的辩论 ID", code: "INVALID_DEBATE_ID" },
        { status: 400 }
      );
    }

    // 检查辩论是否存在
    const debate = debateRepository.findById(debateId);
    if (!debate) {
      return NextResponse.json(
        { error: "辩论不存在", code: "DEBATE_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 检查辩论是否正在运行
    if (!debateService.isRunning(debateId)) {
      return NextResponse.json(
        { error: "辩论未在运行中", code: "DEBATE_NOT_RUNNING" },
        { status: 400 }
      );
    }

    // 停止辩论
    debateService.stopDebate(debateId);

    // 返回更新后的辩论信息
    const updatedDebate = debateRepository.findById(debateId);

    return NextResponse.json(
      {
        id: updatedDebate?.id,
        topic: updatedDebate?.topic,
        status: updatedDebate?.status,
        message: "辩论已停止",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("停止辩论失败:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "停止辩论失败",
        code: "DEBATE_STOP_FAILED",
      },
      { status: 500 }
    );
  }
}
