/**
 * Integration Test for Final Judgment
 * Tests complete judgment generation flow
 */

import { describe, it, expect, beforeAll } from "vitest";

describe("Final Judgment - Integration Tests", () => {
  const baseUrl = "http://localhost:3000";
  let debateId: number;

  beforeAll(async () => {
    // Create a test debate that will be completed
    const createResponse = await fetch(`${baseUrl}/api/debates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: "测试辩题 - 应该禁止核武器",
        pro_definition: "核武器威胁人类生存，必须禁止",
        con_definition: "核武器是威慑力量，维护和平",
        max_rounds: 2,
        judge_weight: 0.7,
        audience_weight: 0.3,
        agents: [
          {
            role: "debater",
            stance: "pro",
            model_provider: "openai",
            model_name: "gpt-3.5-turbo",
          },
          {
            role: "debater",
            stance: "con",
            model_provider: "openai",
            model_name: "gpt-3.5-turbo",
          },
          {
            role: "judge",
            model_provider: "openai",
            model_name: "gpt-4",
          },
          {
            role: "audience",
            model_provider: "openai",
            model_name: "gpt-3.5-turbo",
            audience_type: "rational",
          },
        ],
      }),
    });

    if (createResponse.ok) {
      const data = await createResponse.json();
      debateId = data.id;

      // Start the debate
      await fetch(`${baseUrl}/api/debates/${debateId}/start`, {
        method: "POST",
      });

      // Wait for debate to complete (max 3 minutes)
      await waitForDebateCompletion(debateId);
    }
  });

  async function waitForDebateCompletion(id: number, maxWait = 180000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      const response = await fetch(`${baseUrl}/api/debates/${id}`);
      const data = await response.json();

      if (data.status === "completed" || data.status === "failed") {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  it("should generate final judgment report for completed debate", async () => {
    const response = await fetch(`${baseUrl}/api/debates/${debateId}/report`);
    expect(response.status).toBe(200);

    const data = await response.json();

    // Verify report structure
    expect(data).toHaveProperty("debate");
    expect(data).toHaveProperty("judgment");
    expect(data).toHaveProperty("rounds");
    expect(data).toHaveProperty("round_summaries");

    // Verify debate info
    expect(data.debate.id).toBe(debateId);
    expect(data.debate.status).toBe("completed");
    expect(data.debate.winner).toBeDefined();

    // Verify judgment
    expect(data.judgment).toHaveProperty("debate_id", debateId);
    expect(data.judgment).toHaveProperty("winner");
    expect(data.judgment).toHaveProperty("final_scores");
    expect(data.judgment).toHaveProperty("judge_scores");
    expect(data.judgment).toHaveProperty("winning_arguments");
    expect(data.judgment).toHaveProperty("foul_records");
    expect(data.judgment).toHaveProperty("summary");

    // Verify winner is valid
    expect(["pro", "con", "draw"]).toContain(data.judgment.winner);

    // Verify scores are numbers
    expect(typeof data.judgment.final_scores.pro).toBe("number");
    expect(typeof data.judgment.final_scores.con).toBe("number");
  });

  it("should return 404 for non-existent debate report", async () => {
    const response = await fetch(`${baseUrl}/api/debates/99999/report`);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.code).toBe("DEBATE_NOT_FOUND");
  });

  it("should return 400 for report when debate is not completed", async () => {
    // Create a new debate without starting
    const createResponse = await fetch(`${baseUrl}/api/debates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: "测试辩题",
        max_rounds: 2,
        judge_weight: 0.7,
        audience_weight: 0.3,
        agents: [
          {
            role: "debater",
            stance: "pro",
            model_provider: "openai",
            model_name: "gpt-3.5-turbo",
          },
          {
            role: "debater",
            stance: "con",
            model_provider: "openai",
            model_name: "gpt-3.5-turbo",
          },
          {
            role: "judge",
            model_provider: "openai",
            model_name: "gpt-4",
          },
          {
            role: "audience",
            model_provider: "openai",
            model_name: "gpt-3.5-turbo",
            audience_type: "rational",
          },
        ],
      }),
    });

    const createdData = await createResponse.json();

    const response = await fetch(`${baseUrl}/api/debates/${createdData.id}/report`);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.code).toBe("DEBATE_NOT_COMPLETED");
  });

  it("should include round summaries with scores", async () => {
    const response = await fetch(`${baseUrl}/api/debates/${debateId}/report`);
    const data = await response.json();

    expect(data.round_summaries).toBeInstanceOf(Array);
    expect(data.round_summaries.length).toBeGreaterThan(0);

    // Verify each round summary structure
    if (data.round_summaries.length > 0) {
      const firstRound = data.round_summaries[0];
      expect(firstRound).toHaveProperty("round_id");
      expect(firstRound).toHaveProperty("sequence");
      expect(firstRound).toHaveProperty("pro_score");
      expect(firstRound).toHaveProperty("con_score");
      expect(firstRound).toHaveProperty("pro_fouls");
      expect(firstRound).toHaveProperty("con_fouls");

      // Verify scores are numbers
      expect(typeof firstRound.pro_score).toBe("number");
      expect(typeof firstRound.con_score).toBe("number");

      // Verify fouls are arrays
      expect(Array.isArray(firstRound.pro_fouls)).toBe(true);
      expect(Array.isArray(firstRound.con_fouls)).toBe(true);
    }
  });

  it("should include detailed round information", async () => {
    const response = await fetch(`${baseUrl}/api/debates/${debateId}/report`);
    const data = await response.json();

    expect(data.rounds).toBeInstanceOf(Array);

    if (data.rounds.length > 0) {
      const firstRound = data.rounds[0];
      expect(firstRound).toHaveProperty("round_id");
      expect(firstRound).toHaveProperty("sequence");
      expect(firstRound).toHaveProperty("phase");
      expect(firstRound).toHaveProperty("scores");
      expect(firstRound).toHaveProperty("messages");

      // Verify scores array
      expect(Array.isArray(firstRound.scores)).toBe(true);
      if (firstRound.scores.length > 0) {
        const firstScore = firstRound.scores[0];
        expect(firstScore).toHaveProperty("agent_id");
        expect(firstScore).toHaveProperty("logic");
        expect(firstScore).toHaveProperty("rebuttal");
        expect(firstScore).toHaveProperty("clarity");
        expect(firstScore).toHaveProperty("evidence");
        expect(firstScore).toHaveProperty("total");
        expect(firstScore).toHaveProperty("comment");
      }

      // Verify messages array
      expect(Array.isArray(firstRound.messages)).toBe(true);
      if (firstRound.messages.length > 0) {
        const firstMessage = firstRound.messages[0];
        expect(firstMessage).toHaveProperty("agent_id");
        expect(firstMessage).toHaveProperty("content");
        expect(firstMessage).toHaveProperty("created_at");
      }
    }
  });

  it("should correctly calculate total scores", async () => {
    const response = await fetch(`${baseUrl}/api/debates/${debateId}/report`);
    const data = await response.json();

    const judgment = data.judgment;

    // Verify judge scores
    expect(judgment.judge_scores.pro).toBeGreaterThanOrEqual(0);
    expect(judgment.judge_scores.con).toBeGreaterThanOrEqual(0);

    // Verify final scores match weighted calculation
    const debate = data.debate;
    const expectedProScore = judgment.judge_scores.pro * debate.judge_weight;
    const expectedConScore = judgment.judge_scores.con * debate.judge_weight;

    expect(Math.abs(judgment.final_scores.pro - expectedProScore)).toBeLessThan(0.1);
    expect(Math.abs(judgment.final_scores.con - expectedConScore)).toBeLessThan(0.1);
  });

  it("should identify key turning round if applicable", async () => {
    const response = await fetch(`${baseUrl}/api/debates/${debateId}/report`);
    const data = await response.json();

    const judgment = data.judgment;

    // key_turning_round is optional and may be undefined
    if (judgment.key_turning_round !== undefined) {
      expect(typeof judgment.key_turning_round).toBe("number");
      expect(judgment.key_turning_round).toBeGreaterThan(0);
      expect(judgment.key_turning_round).toBeLessThanOrEqual(data.debate.max_rounds);
    }
  });

  it("should provide meaningful summary", async () => {
    const response = await fetch(`${baseUrl}/api/debates/${debateId}/report`);
    const data = await response.json();

    const judgment = data.judgment;

    expect(judgment.summary).toBeDefined();
    expect(typeof judgment.summary).toBe("string");
    expect(judgment.summary.length).toBeGreaterThan(0);

    // Summary should mention the winner (unless draw)
    if (judgment.winner !== "draw") {
      expect(judgment.summary).toMatch(/正方|反方/);
    }
  });
});
