/**
 * Integration Test for Audience Voting
 * Tests complete voting aggregation and analysis flow
 */

import { describe, it, expect, beforeAll } from "vitest";

describe("Audience Voting - Integration Tests", () => {
  const baseUrl = "http://localhost:3000";
  let debateId: number;

  beforeAll(async () => {
    // Create a test debate with multiple audience agents
    const createResponse = await fetch(`${baseUrl}/api/debates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: "测试观众投票 - 人工智能是否会取代人类工作",
        pro_definition: "AI 将取代大部分重复性工作，提高效率",
        con_definition: "AI 只能辅助人类，无法取代创造力",
        max_rounds: 2,
        judge_weight: 0.6,
        audience_weight: 0.4,
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
          // Multiple audience agents with different perspectives
          {
            role: "audience",
            model_provider: "openai",
            model_name: "gpt-3.5-turbo",
            audience_type: "rational",
          },
          {
            role: "audience",
            model_provider: "openai",
            model_name: "gpt-3.5-turbo",
            audience_type: "pragmatic",
          },
          {
            role: "audience",
            model_provider: "openai",
            model_name: "gpt-3.5-turbo",
            audience_type: "technical",
          },
          {
            role: "audience",
            model_provider: "openai",
            model_name: "gpt-3.5-turbo",
            audience_type: "emotional",
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

      // Wait for debate to complete
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

  it("should include voting analysis in report", async () => {
    const response = await fetch(`${baseUrl}/api/debates/${debateId}/report`);
    expect(response.status).toBe(200);

    const data = await response.json();

    // Verify voting_analysis exists
    expect(data).toHaveProperty("voting_analysis");

    const votingAnalysis = data.voting_analysis;

    // Verify aggregation structure
    expect(votingAnalysis).toHaveProperty("aggregation");
    expect(votingAnalysis).toHaveProperty("divergence");
    expect(votingAnalysis).toHaveProperty("blind_spots");
  });

  it("should correctly aggregate audience votes", async () => {
    const response = await fetch(`${baseUrl}/api/debates/${debateId}/report`);
    const data = await response.json();

    const aggregation = data.voting_analysis.aggregation;

    // Verify aggregation structure
    expect(aggregation).toHaveProperty("pro_votes");
    expect(aggregation).toHaveProperty("con_votes");
    expect(aggregation).toHaveProperty("draw_votes");
    expect(aggregation).toHaveProperty("total_audience");
    expect(aggregation).toHaveProperty("pro_percentage");
    expect(aggregation).toHaveProperty("con_percentage");
    expect(aggregation).toHaveProperty("draw_percentage");
    expect(aggregation).toHaveProperty("weighted_score");

    // Verify data types
    expect(typeof aggregation.pro_votes).toBe("number");
    expect(typeof aggregation.con_votes).toBe("number");
    expect(typeof aggregation.draw_votes).toBe("number");
    expect(typeof aggregation.total_audience).toBe("number");

    // Verify percentages are between 0 and 1
    expect(aggregation.pro_percentage).toBeGreaterThanOrEqual(0);
    expect(aggregation.pro_percentage).toBeLessThanOrEqual(1);
    expect(aggregation.con_percentage).toBeGreaterThanOrEqual(0);
    expect(aggregation.con_percentage).toBeLessThanOrEqual(1);
    expect(aggregation.draw_percentage).toBeGreaterThanOrEqual(0);
    expect(aggregation.draw_percentage).toBeLessThanOrEqual(1);

    // Verify total matches sum of individual votes
    const totalVotes = aggregation.pro_votes + aggregation.con_votes + aggregation.draw_votes;
    expect(totalVotes).toBeLessThanOrEqual(aggregation.total_audience);
  });

  it("should calculate weighted scores for audience", async () => {
    const response = await fetch(`${baseUrl}/api/debates/${debateId}/report`);
    const data = await response.json();

    const aggregation = data.voting_analysis.aggregation;

    // Verify weighted score structure
    expect(aggregation.weighted_score).toHaveProperty("pro");
    expect(aggregation.weighted_score).toHaveProperty("con");

    // Verify weighted scores are numbers
    expect(typeof aggregation.weighted_score.pro).toBe("number");
    expect(typeof aggregation.weighted_score.con).toBe("number");

    // Weighted scores should be proportional to votes
    expect(aggregation.weighted_score.pro).toBe(aggregation.pro_votes * 10);
    expect(aggregation.weighted_score.con).toBe(aggregation.con_votes * 10);
  });

  it("should analyze perspective divergence", async () => {
    const response = await fetch(`${baseUrl}/api/debates/${debateId}/report`);
    const data = await response.json();

    const divergence = data.voting_analysis.divergence;

    // Verify divergence structure
    expect(divergence).toHaveProperty("highest_divergence_round");
    expect(divergence).toHaveProperty("rational_votes");
    expect(divergence).toHaveProperty("pragmatic_votes");
    expect(divergence).toHaveProperty("technical_votes");
    expect(divergence).toHaveProperty("risk_averse_votes");
    expect(divergence).toHaveProperty("emotional_votes");
    expect(divergence).toHaveProperty("overall_divergence");

    // Verify each audience type vote structure
    const voteTypes = [
      "rational_votes",
      "pragmatic_votes",
      "technical_votes",
      "risk_averse_votes",
      "emotional_votes",
    ];

    for (const voteType of voteTypes) {
      expect(divergence[voteType as keyof typeof divergence]).toHaveProperty("pro");
      expect(divergence[voteType as keyof typeof divergence]).toHaveProperty("con");
      expect(divergence[voteType as keyof typeof divergence]).toHaveProperty("draw");

      // Votes should be non-negative numbers
      const votes = divergence[voteType as keyof typeof divergence] as { pro: number; con: number; draw: number };
      expect(votes.pro).toBeGreaterThanOrEqual(0);
      expect(votes.con).toBeGreaterThanOrEqual(0);
      expect(votes.draw).toBeGreaterThanOrEqual(0);
    }

    // Verify divergence is between 0 and 1
    expect(divergence.overall_divergence).toBeGreaterThanOrEqual(0);
    expect(divergence.overall_divergence).toBeLessThanOrEqual(1);
  });

  it("should analyze blind spots for both sides", async () => {
    const response = await fetch(`${baseUrl}/api/debates/${debateId}/report`);
    const data = await response.json();

    const blindSpots = data.voting_analysis.blind_spots;

    // Verify blind spots structure
    expect(blindSpots).toHaveProperty("pro_blind_spots");
    expect(blindSpots).toHaveProperty("con_blind_spots");
    expect(blindSpots).toHaveProperty("shared_blind_spots");
    expect(blindSpots).toHaveProperty("missed_opportunities");

    // Verify all are arrays
    expect(Array.isArray(blindSpots.pro_blind_spots)).toBe(true);
    expect(Array.isArray(blindSpots.con_blind_spots)).toBe(true);
    expect(Array.isArray(blindSpots.shared_blind_spots)).toBe(true);
    expect(Array.isArray(blindSpots.missed_opportunities)).toBe(true);

    // Verify blind spot items are strings (if any)
    const allBlindSpots = [
      ...blindSpots.pro_blind_spots,
      ...blindSpots.con_blind_spots,
      ...blindSpots.shared_blind_spots,
      ...blindSpots.missed_opportunities,
    ];

    for (const blindSpot of allBlindSpots) {
      expect(typeof blindSpot).toBe("string");
      expect(blindSpot.length).toBeGreaterThan(0);
    }
  });

  it("should calculate weighted result combining judge and audience", async () => {
    const response = await fetch(`${baseUrl}/api/debates/${debateId}/report`);
    const data = await response.json();

    const debate = data.debate;
    const judgment = data.judgment;

    // Verify judgment has audience scores
    expect(judgment).toHaveProperty("audience_scores");
    expect(judgment.audience_scores).toHaveProperty("pro");
    expect(judgment.audience_scores).toHaveProperty("con");

    // Verify final scores include both judge and audience contributions
    expect(judgment.final_scores).toHaveProperty("pro");
    expect(judgment.final_scores).toHaveProperty("con");
    expect(judgment.final_scores).toHaveProperty("winner");

    // Verify winner is valid
    expect(["pro", "con", "draw"]).toContain(judgment.final_scores.winner);

    // Calculate expected weighted scores
    const judgeWeight = debate.judge_weight;
    const audienceWeight = debate.audience_weight;

    const expectedProScore =
      judgment.judge_scores.pro * judgeWeight +
      judgment.audience_scores.pro * audienceWeight;
    const expectedConScore =
      judgment.judge_scores.con * judgeWeight +
      judgment.audience_scores.con * audienceWeight;

    // Allow small floating point errors
    expect(Math.abs(judgment.final_scores.pro - expectedProScore)).toBeLessThan(0.1);
    expect(Math.abs(judgment.final_scores.con - expectedConScore)).toBeLessThan(0.1);
  });

  it("should handle debates with no audience votes gracefully", async () => {
    // Create a debate without audience agents
    const createResponse = await fetch(`${baseUrl}/api/debates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: "无观众辩论测试",
        pro_definition: "正方定义",
        con_definition: "反方定义",
        max_rounds: 1,
        judge_weight: 1,
        audience_weight: 0,
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
        ],
      }),
    });

    if (createResponse.ok) {
      const data = await createResponse.json();
      const noAudienceId = data.id;

      // Start and wait for completion
      await fetch(`${baseUrl}/api/debates/${noAudienceId}/start`, {
        method: "POST",
      });
      await waitForDebateCompletion(noAudienceId);

      // Get report
      const reportResponse = await fetch(`${baseUrl}/api/debates/${noAudienceId}/report`);
      expect(reportResponse.status).toBe(200);

      const reportData = await reportResponse.json();

      // Voting analysis should exist but show zero votes
      expect(reportData.voting_analysis).toBeDefined();
      expect(reportData.voting_analysis.aggregation.pro_votes).toBe(0);
      expect(reportData.voting_analysis.aggregation.con_votes).toBe(0);
    }
  });

  it("should correctly determine winner based on combined scores", async () => {
    const response = await fetch(`${baseUrl}/api/debates/${debateId}/report`);
    const data = await response.json();

    const finalScores = data.judgment.final_scores;
    const winner = finalScores.winner;

    // Verify winner matches scores
    if (winner === "pro") {
      expect(finalScores.pro).toBeGreaterThan(finalScores.con);
    } else if (winner === "con") {
      expect(finalScores.con).toBeGreaterThan(finalScores.pro);
    } else {
      // Draw - scores should be close
      expect(Math.abs(finalScores.pro - finalScores.con)).toBeLessThan(5);
    }
  });

  it("should include voting analysis in judgment summary", async () => {
    const response = await fetch(`${baseUrl}/api/debates/${debateId}/report`);
    const data = await response.json();

    const votingAnalysis = data.voting_analysis;
    const aggregation = votingAnalysis.aggregation;

    // Verify voting data is reasonable
    expect(aggregation.total_audience).toBeGreaterThan(0);

    // At least some votes should be cast
    const totalVotes = aggregation.pro_votes + aggregation.con_votes + aggregation.draw_votes;
    expect(totalVotes).toBeGreaterThan(0);
  });
});
