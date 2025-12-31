import { NextRequest, NextResponse } from "next/server";
import { debateRepository } from "@/lib/repositories/debate.repository";
import { agentRepository } from "@/lib/repositories/agent.repository";
import logger from "@/lib/utils/logger";

export const runtime = "nodejs";

/**
 * GET /api/debates/[id] - 获取辩论详情
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "无效的辩论 ID" },
        { status: 400 }
      );
    }

    const debate = debateRepository.findById(id);

    if (!debate) {
      return NextResponse.json(
        { error: "辩论不存在" },
        { status: 404 }
      );
    }

    const agents = agentRepository.findByDebateId(id);

    return NextResponse.json({
      ...debate,
      agents,
    });
  } catch (error) {
    logger.error("获取辩论详情失败", error instanceof Error ? error : undefined);
    return NextResponse.json(
      {
        error: "获取辩论详情失败",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/debates/[id] - 删除辩论
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "无效的辩论 ID" },
        { status: 400 }
      );
    }

    const debate = debateRepository.findById(id);

    if (!debate) {
      return NextResponse.json(
        { error: "辩论不存在" },
        { status: 404 }
      );
    }

    // 只能删除 pending 或 completed 状态的辩论
    if (debate.status === "running") {
      return NextResponse.json(
        { error: "无法删除正在进行的辩论" },
        { status: 400 }
      );
    }

    debateRepository.delete(id);

    logger.info("辩论已删除", { debate_id: id });

    return NextResponse.json({ message: "辩论已删除" }, { status: 200 });
  } catch (error) {
    logger.error("删除辩论失败", error instanceof Error ? error : undefined);
    return NextResponse.json(
      {
        error: "删除辩论失败",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
