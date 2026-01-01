/**
 * GET /api/debates/[id]/messages
 * 获取辩论的所有消息
 */

import { NextRequest, NextResponse } from "next/server";
import { debateRepository } from "@/lib/repositories/debate.repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  // 获取消息（带 Agent 和 Round 信息）
  const db = (await import("@/lib/db/client")).getDb();
  const messages = db
    .prepare(
      `SELECT m.id, m.agent_id, m.content, m.created_at, r.sequence as round_sequence, a.role, a.stance
       FROM messages m
       JOIN rounds r ON m.round_id = r.id
       JOIN agents a ON m.agent_id = a.id
       WHERE r.debate_id = ?
       ORDER BY m.created_at`
    )
    .all(debateId) as Array<{
      id: number;
      agent_id: string;
      content: string;
      created_at: string;
      round_sequence: number;
      role: string;
      stance?: string;
    }>;

  // 格式化消息
  const formattedMessages = messages.map((msg) => ({
    id: String(msg.id),
    role: msg.role,
    stance: msg.stance,
    content: msg.content,
    timestamp: msg.created_at,
    roundId: msg.round_sequence,
  }));

  return NextResponse.json({
    messages: formattedMessages,
    count: formattedMessages.length,
  });
}
