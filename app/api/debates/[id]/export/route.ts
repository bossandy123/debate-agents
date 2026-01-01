/**
 * GET /api/debates/[id]/export
 * 导出辩论数据为 JSON 格式
 */

import { NextRequest, NextResponse } from "next/server";
import { debateRepository } from "@/lib/repositories/debate.repository";
import { agentRepository } from "@/lib/repositories/agent.repository";
import { roundRepository } from "@/lib/repositories/round.repository";
import { messageRepository } from "@/lib/repositories/message.repository";
import { scoreRepository } from "@/lib/repositories/score.repository";
import { voteRepository } from "@/lib/repositories/vote.repository";
import { scoringService } from "@/lib/services/scoring-service";
import { votingService } from "@/lib/services/voting-service";

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

    // 获取所有相关数据
    const agents = agentRepository.findByDebateId(debateId);
    const rounds = roundRepository.findByDebateId(debateId);
    const votes = voteRepository.findByDebateId(debateId);

    // 为每个轮次收集详细数据
    const roundsData = await Promise.all(
      rounds.map(async (round) => {
        const scores = scoreRepository.findByRoundId(round.id);
        const messages = messageRepository.findByRoundIdWithAgent(round.id);

        return {
          round_id: round.id,
          sequence: round.sequence,
          phase: round.phase,
          type: round.type,
          started_at: round.started_at,
          completed_at: round.completed_at,
          scores: scores.map((s) => ({
            agent_id: s.agent_id,
            logic: s.logic,
            rebuttal: s.rebuttal,
            clarity: s.clarity,
            evidence: s.evidence,
            total: s.logic + s.rebuttal + s.clarity + s.evidence,
            comment: s.comment,
          })),
          messages: messages.map((m) => ({
            message_id: m.id,
            agent_id: m.agent_id,
            agent_role: m.agent.role,
            agent_stance: m.agent.stance,
            content: m.content,
            token_count: m.token_count,
            created_at: m.created_at,
          })),
        };
      })
    );

    // 获取最终裁决（如果辩论已完成）
    let judgment = null;
    if (debate.status === "completed") {
      try {
        judgment = await scoringService.generateFinalJudgment(debateId);
      } catch {
        // 裁决生成失败，不影响导出
      }
    }

    // 获取观众投票分析（如果有投票）
    let votingAnalysis = null;
    if (votes.length > 0) {
      try {
        votingAnalysis = votingService.generateVotingAnalysis(debateId);
      } catch {
        // 投票分析失败，不影响导出
      }
    }

    // 构建完整导出数据
    const exportData = {
      metadata: {
        exported_at: new Date().toISOString(),
        export_version: "1.0",
        debate_id: debateId,
      },
      debate: {
        id: debate.id,
        topic: debate.topic,
        pro_definition: debate.pro_definition,
        con_definition: debate.con_definition,
        status: debate.status,
        max_rounds: debate.max_rounds,
        judge_weight: debate.judge_weight,
        audience_weight: debate.audience_weight,
        winner: debate.winner,
        created_at: debate.created_at,
        started_at: debate.started_at,
        completed_at: debate.completed_at,
      },
      agents: agents.map((a) => ({
        id: a.id,
        role: a.role,
        stance: a.stance,
        model_provider: a.model_provider,
        model_name: a.model_name,
        audience_type: a.audience_type,
      })),
      rounds: roundsData,
      votes: votes.map((v) => ({
        agent_id: v.agent_id,
        vote: v.vote,
        confidence: v.confidence,
        reason: v.reason,
      })),
      judgment,
      voting_analysis: votingAnalysis,
      statistics: {
        total_rounds: rounds.length,
        completed_rounds: rounds.filter((r) => r.completed_at !== null).length,
        total_agents: agents.length,
        total_messages: roundsData.reduce((sum, r) => sum + r.messages.length, 0),
        total_votes: votes.length,
      },
    };

    // 设置响应头以提示下载
    const filename = `debate-${debateId}-${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("导出辩论数据失败:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "导出辩论数据失败",
        code: "EXPORT_FAILED",
      },
      { status: 500 }
    );
  }
}
