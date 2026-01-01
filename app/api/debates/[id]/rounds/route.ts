/**
 * GET /api/debates/[id]/rounds
 * 获取辩论的轮次列表 API 端点
 */

import { NextRequest, NextResponse } from "next/server";
import { debateRepository } from "@/lib/repositories/debate.repository";
import { roundRepository } from "@/lib/repositories/round.repository";
import { scoreRepository } from "@/lib/repositories/score.repository";
import { messageRepository } from "@/lib/repositories/message.repository";

export const runtime = "nodejs";

export async function GET(
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

    // 获取轮次列表
    const rounds = roundRepository.findByDebateId(debateId);

    // 为每个轮次添加统计信息
    const roundsWithStats = rounds.map((round) => {
      const scores = scoreRepository.findByRoundId(round.id);
      const messages = messageRepository.findByRoundId(round.id);

      // 计算双方得分
      let proScore = 0;
      let conScore = 0;

      for (const score of scores) {
        const total = score.logic + score.rebuttal + score.clarity + score.evidence;
        if (score.agent_id.includes("pro")) {
          proScore = total;
        } else if (score.agent_id.includes("con")) {
          conScore = total;
        }
      }

      return {
        round_id: round.id,
        sequence: round.sequence,
        phase: round.phase,
        type: round.type,
        started_at: round.started_at,
        completed_at: round.completed_at,
        pro_score: proScore,
        con_score: conScore,
        score_diff: Math.abs(proScore - conScore),
        message_count: messages.length,
        is_completed: round.completed_at !== null,
      };
    });

    return NextResponse.json({
      debate_id: debateId,
      total_rounds: rounds.length,
      completed_rounds: rounds.filter((r) => r.completed_at !== null).length,
      rounds: roundsWithStats,
    });
  } catch (error) {
    console.error("获取轮次列表失败:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "获取轮次列表失败",
        code: "ROUNDS_LIST_FAILED",
      },
      { status: 500 }
    );
  }
}
