/**
 * GET /api/debates/[id]/rounds/[sequence]
 * 获取单轮详情 API 端点
 */

import { NextRequest, NextResponse } from "next/server";
import { debateRepository } from "@/lib/repositories/debate.repository";
import { roundRepository } from "@/lib/repositories/round.repository";
import { scoreRepository } from "@/lib/repositories/score.repository";
import { messageRepository } from "@/lib/repositories/message.repository";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sequence: string }> }
) {
  try {
    const { id, sequence } = await params;
    const debateId = parseInt(id);
    const roundSequence = parseInt(sequence);

    if (isNaN(debateId) || isNaN(roundSequence)) {
      return NextResponse.json(
        { error: "无效的辩论 ID 或轮次序号", code: "INVALID_PARAMS" },
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

    // 查找指定轮次
    const round = roundRepository.findByDebateIdAndSequence(debateId, roundSequence);
    if (!round) {
      return NextResponse.json(
        { error: "轮次不存在", code: "ROUND_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 获取该轮次的评分
    const scores = scoreRepository.findByRoundId(round.id);

    // 获取该轮次的发言
    const messages = messageRepository.findByRoundIdWithAgent(round.id);

    // 格式化评分数据
    const formattedScores = scores.map((score) => ({
      agent_id: score.agent_id,
      logic: score.logic,
      rebuttal: score.rebuttal,
      clarity: score.clarity,
      evidence: score.evidence,
      total: score.logic + score.rebuttal + score.clarity + score.evidence,
      comment: score.comment,
    }));

    // 格式化发言数据
    const formattedMessages = messages.map((msg) => ({
      message_id: msg.id,
      agent_id: msg.agent_id,
      agent_role: msg.agent.role,
      agent_stance: msg.agent.stance,
      content: msg.content,
      token_count: msg.token_count,
      created_at: msg.created_at,
    }));

    // 计算本轮得分对比
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

    return NextResponse.json({
      round: {
        round_id: round.id,
        sequence: round.sequence,
        phase: round.phase,
        type: round.type,
        started_at: round.started_at,
        completed_at: round.completed_at,
        is_completed: round.completed_at !== null,
      },
      scores: {
        pro_score: proScore,
        con_score: conScore,
        score_diff: Math.abs(proScore - conScore),
        leader: proScore > conScore ? "pro" : conScore > proScore ? "con" : "draw",
        details: formattedScores,
      },
      messages: formattedMessages,
      message_count: messages.length,
    });
  } catch (error) {
    console.error("获取轮次详情失败:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "获取轮次详情失败",
        code: "ROUND_DETAIL_FAILED",
      },
      { status: 500 }
    );
  }
}
