/**
 * GET /api/debates/[id]/report
 * 获取辩论复盘报告 API 端点
 */

import { NextRequest, NextResponse } from "next/server";
import { debateRepository } from "@/lib/repositories/debate.repository";
import { scoringService } from "@/lib/services/scoring-service";
import { votingService } from "@/lib/services/voting-service";
import { roundRepository } from "@/lib/repositories/round.repository";
import { messageRepository } from "@/lib/repositories/message.repository";
import { scoreRepository } from "@/lib/repositories/score.repository";
import { agentRepository } from "@/lib/repositories/agent.repository";

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

    // 检查辩论是否已完成
    if (debate.status !== "completed") {
      return NextResponse.json(
        { error: "辩论尚未完成，无法生成复盘报告", code: "DEBATE_NOT_COMPLETED" },
        { status: 400 }
      );
    }

    // 生成最终裁决
    const finalJudgment = await scoringService.generateFinalJudgment(debateId);

    // 获取轮次详情
    const rounds = roundRepository.findByDebateId(debateId);
    const agents = agentRepository.findByDebateId(debateId);
    const agentMap = new Map(agents.map((a) => [a.id, a.stance]));

    const roundDetails = await Promise.all(
      rounds.map(async (round) => {
        const scores = scoreRepository.findByRoundId(round.id);
        const messages = messageRepository.findByRoundId(round.id);

        return {
          round_id: round.id,
          sequence: round.sequence,
          phase: round.phase,
          started_at: round.started_at,
          completed_at: round.completed_at,
          scores: scores.map((s) => ({
            agent_id: s.agent_id,
            stance: agentMap.get(s.agent_id),
            logic: s.logic,
            rebuttal: s.rebuttal,
            clarity: s.clarity,
            evidence: s.evidence,
            total: s.logic + s.rebuttal + s.clarity + s.evidence,
            comment: s.comment,
          })),
          messages: messages.map((m) => ({
            agent_id: m.agent_id,
            stance: agentMap.get(m.agent_id),
            content: m.content,
            created_at: m.created_at,
          })),
        };
      })
    );

    // 获取轮次评分汇总
    const roundSummaries = scoringService.getRoundScoreSummaries(debateId);

    // 生成观众投票分析
    const votingAnalysis = votingService.generateVotingAnalysis(debateId);

    // 计算加权结果（裁判评分 + 观众投票）
    const weightedResult = votingService.calculateWeightedResult(
      debateId,
      debate.judge_weight,
      debate.audience_weight
    );

    return NextResponse.json({
      debate: {
        id: debate.id,
        topic: debate.topic,
        status: debate.status,
        winner: weightedResult.winner,
        max_rounds: debate.max_rounds,
        judge_weight: debate.judge_weight,
        audience_weight: debate.audience_weight,
        created_at: debate.created_at,
        started_at: debate.started_at,
        completed_at: debate.completed_at,
      },
      judgment: {
        ...finalJudgment,
        audience_scores: votingAnalysis.aggregation.weighted_score,
        final_scores: weightedResult,
      },
      voting_analysis: votingAnalysis,
      rounds: roundDetails,
      round_summaries: roundSummaries,
    });
  } catch (error) {
    console.error("获取复盘报告失败:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "获取复盘报告失败",
        code: "REPORT_GENERATION_FAILED",
      },
      { status: 500 }
    );
  }
}
