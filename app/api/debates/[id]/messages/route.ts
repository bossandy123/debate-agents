/**
 * GET /api/debates/[id]/messages
 * 获取辩论的所有消息
 */

import { NextRequest, NextResponse } from "next/server";
import { debateRepository } from "@/lib/repositories/debate.repository";
import { messageRepository } from "@/lib/repositories/message.repository";
import { agentRepository } from "@/lib/repositories/agent.repository";

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

  // 获取消息（带 Agent 信息）
  const messages = messageRepository.findByDebateId(debateId);

  // 获取所有 agents 信息
  const agents = agentRepository.findByDebateId(debateId);
  const agentMap = new Map(agents.map((a) => [a.id, a]));

  // 格式化消息，添加 agent 信息
  const formattedMessages = messages.map((msg) => {
    const agent = agentMap.get(msg.agent_id);
    return {
      id: String(msg.id),
      role: agent?.role || "unknown",
      stance: agent?.stance,
      content: msg.content,
      timestamp: msg.created_at,
    };
  });

  return NextResponse.json({
    messages: formattedMessages,
    count: formattedMessages.length,
  });
}
