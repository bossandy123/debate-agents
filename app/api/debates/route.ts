import { NextRequest, NextResponse } from "next/server";
import { debateRepository } from "@/lib/repositories/debate.repository";
import { agentRepository } from "@/lib/repositories/agent.repository";
import { generateAgentId } from "@/lib/models/agent";
import type { CreateDebateInput } from "@/lib/models/debate";
import { validateDebateInput } from "@/lib/models/debate";
import { validateAgentInput } from "@/lib/models/agent";
import logger from "@/lib/utils/logger";

export const runtime = "nodejs";

/**
 * POST /api/debates - 创建新辩论
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证基本输入
    const debateErrors = validateDebateInput(body);
    if (debateErrors.length > 0) {
      return NextResponse.json(
        { error: "验证失败", details: debateErrors },
        { status: 400 }
      );
    }

    // 创建辩论输入
    const debateInput: CreateDebateInput = {
      topic: body.topic,
      pro_definition: body.pro_definition,
      con_definition: body.con_definition,
      max_rounds: body.max_rounds,
      judge_weight: body.judge_weight,
      audience_weight: body.audience_weight,
    };

    // 创建辩论
    const debate = debateRepository.create(debateInput);

    // 创建 Agents
    const agents = body.agents || [];
    if (agents.length < 4) {
      return NextResponse.json(
        {
          error: "验证失败",
          details: ["至少需要 4 个 Agent（2 个辩手、1 个裁判、1 个观众）"],
        },
        { status: 400 }
      );
    }

    const createdAgents = [];
    for (const agentConfig of agents) {
      const agentInput = {
        id: agentConfig.id || generateAgentId(),
        debate_id: debate.id,
        role: agentConfig.role,
        stance: agentConfig.stance,
        model_provider: agentConfig.model_provider,
        model_name: agentConfig.model_name,
        style_tag: agentConfig.style_tag,
        audience_type: agentConfig.audience_type,
        config: agentConfig.config,
      };

      // 验证 Agent 配置
      const agentErrors = validateAgentInput(agentInput);
      if (agentErrors.length > 0) {
        // 回滚：删除已创建的辩论和 agents
        agentRepository.deleteByDebateId(debate.id);
        debateRepository.delete(debate.id);
        return NextResponse.json(
          {
            error: "Agent 验证失败",
            details: agentErrors,
            agent: agentConfig,
          },
          { status: 400 }
        );
      }

      const agent = agentRepository.create(agentInput);
      createdAgents.push(agent);
    }

    logger.info("辩论创建成功", {
      debate_id: debate.id,
      topic: debate.topic,
      agents_count: createdAgents.length,
    });

    return NextResponse.json(
      {
        id: debate.id,
        message: "辩论创建成功",
        debate,
        agents: createdAgents,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("创建辩论失败", error instanceof Error ? error : undefined);
    return NextResponse.json(
      {
        error: "创建辩论失败",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/debates - 获取辩论列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "分页参数无效" },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;

    const debates = debateRepository.findAll({
      status: (status as "pending" | "running" | "completed" | "failed") || undefined,
      limit,
      offset,
    });

    const total = debateRepository.count({ status: (status as "pending" | "running" | "completed" | "failed") || undefined });

    return NextResponse.json({
      debates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("获取辩论列表失败", error instanceof Error ? error : undefined);
    return NextResponse.json(
      {
        error: "获取辩论列表失败",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
