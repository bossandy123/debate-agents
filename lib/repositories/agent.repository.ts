/**
 * Agent Repository
 * Agent 配置数据访问层
 */

import { getDb } from "@/lib/db/client";
import type { Agent, CreateAgentInput } from "@/lib/models/agent";
import { generateAgentId } from "@/lib/models/agent";

export class AgentRepository {
  /**
   * 创建 Agent
   */
  create(input: CreateAgentInput): Agent {
    const db = getDb();

    const agentId = input.id ?? generateAgentId();

    db.prepare(
      `INSERT INTO agents (id, debate_id, role, stance, model_provider, model_name, style_tag, audience_type, config)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .run(
        agentId,
        input.debate_id,
        input.role,
        input.stance ?? null,
        input.model_provider,
        input.model_name,
        input.style_tag ?? null,
        input.audience_type ?? null,
        input.config ? JSON.stringify(input.config) : null
      );

    return this.findById(agentId)!;
  }

  /**
   * 根据 ID 查找 Agent
   */
  findById(id: string): Agent | null {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM agents WHERE id = ?")
      .get(id) as Agent | undefined;

    if (row) {
      // 解析 config JSON
      if (row.config) {
        row.config = JSON.parse(row.config as unknown as string) as unknown as Agent["config"];
      }
    }

    return row ?? null;
  }

  /**
   * 获取辩论的所有 Agents
   */
  findByDebateId(debateId: number): Agent[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM agents WHERE debate_id = ?")
      .all(debateId) as Agent[];

    return rows.map((row) => ({
      ...row,
      config: row.config ? JSON.parse(row.config as unknown as string) : undefined,
    }));
  }

  /**
   * 根据角色和立场查找 Agent
   */
  findByDebateIdAndRoleAndStance(
    debateId: number,
    role: string,
    stance?: string
  ): Agent | null {
    const db = getDb();

    let query = "SELECT * FROM agents WHERE debate_id = ? AND role = ?";
    const params: (number | string)[] = [debateId, role];

    if (stance) {
      query += " AND stance = ?";
      params.push(stance);
    }

    const row = db.prepare(query).get(...params) as Agent | undefined;

    if (row) {
      if (row.config) {
        row.config = JSON.parse(row.config as unknown as string) as unknown as Agent["config"];
      }
    }

    return row ?? null;
  }

  /**
   * 获取辩论的辩手
   */
  findDebatersByDebateId(debateId: number): Agent[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM agents WHERE debate_id = ? AND role = 'debater'")
      .all(debateId) as Agent[];

    return rows.map((row) => ({
      ...row,
      config: row.config ? JSON.parse(row.config as unknown as string) : undefined,
    }));
  }

  /**
   * 获取辩论的裁判
   */
  findJudgeByDebateId(debateId: number): Agent | null {
    return this.findByDebateIdAndRoleAndStance(debateId, "judge");
  }

  /**
   * 获取辩论的观众
   */
  findAudienceByDebateId(debateId: number): Agent[] {
    const db = getDb();
    const rows = db
      .prepare("SELECT * FROM agents WHERE debate_id = ? AND role = 'audience'")
      .all(debateId) as Agent[];

    return rows.map((row) => ({
      ...row,
      config: row.config ? JSON.parse(row.config as unknown as string) : undefined,
    }));
  }

  /**
   * 批量创建 Agents
   */
  createBatch(inputs: CreateAgentInput[]): Agent[] {
    const db = getDb();
    const transaction = db.transaction(() => {
      return inputs.map((input) => this.create(input));
    });
    return transaction();
  }

  /**
   * 删除辩论的所有 Agents
   */
  deleteByDebateId(debateId: number): number {
    const db = getDb();
    const result = db
      .prepare("DELETE FROM agents WHERE debate_id = ?")
      .run(debateId);
    return result.changes;
  }
}

// 导出单例
export const agentRepository = new AgentRepository();
