/**
 * Contract Test for POST /api/debates
 * Tests API contract compliance for debate creation endpoint
 *
 * NOTE: These tests are designed to work with a running dev server.
 * To run: Start the dev server with `npm run dev` first, then run tests.
 */

import { describe, it, expect } from "vitest";

describe("POST /api/debates - Contract Tests", () => {
  const baseUrl = "http://localhost:3000";

  it("should return 400 when topic is missing", async () => {
    const response = await fetch(`${baseUrl}/api/debates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Missing topic
        max_rounds: 10,
        judge_weight: 0.7,
        audience_weight: 0.3,
        agents: [
          {
            role: "debater",
            stance: "pro",
            model_provider: "openai",
            model_name: "gpt-4",
          },
          {
            role: "debater",
            stance: "con",
            model_provider: "openai",
            model_name: "gpt-4",
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

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should return 400 when agents array has less than 4 agents", async () => {
    const response = await fetch(`${baseUrl}/api/debates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: "测试辩题",
        max_rounds: 10,
        judge_weight: 0.7,
        audience_weight: 0.3,
        agents: [
          {
            role: "debater",
            stance: "pro",
            model_provider: "openai",
            model_name: "gpt-4",
          },
          {
            role: "debater",
            stance: "con",
            model_provider: "openai",
            model_name: "gpt-4",
          },
          {
            role: "judge",
            model_provider: "openai",
            model_name: "gpt-4",
          },
          // Missing audience - only 3 agents
        ],
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
    expect(data.details).toBeDefined();
  });

  it("should return 400 when judge_weight is invalid", async () => {
    const response = await fetch(`${baseUrl}/api/debates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: "测试辩题",
        max_rounds: 10,
        judge_weight: 1.5, // Invalid: > 1
        audience_weight: -0.5, // Invalid: < 0
        agents: [
          {
            role: "debater",
            stance: "pro",
            model_provider: "openai",
            model_name: "gpt-4",
          },
          {
            role: "debater",
            stance: "con",
            model_provider: "openai",
            model_name: "gpt-4",
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

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should return 400 when debater agent is missing stance", async () => {
    const response = await fetch(`${baseUrl}/api/debates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: "测试辩题",
        max_rounds: 10,
        judge_weight: 0.7,
        audience_weight: 0.3,
        agents: [
          {
            role: "debater",
            // Missing stance
            model_provider: "openai",
            model_name: "gpt-4",
          },
          {
            role: "debater",
            stance: "con",
            model_provider: "openai",
            model_name: "gpt-4",
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

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should return 201 and debate data on successful creation", async () => {
    const response = await fetch(`${baseUrl}/api/debates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: "人工智能是否会取代人类工作",
        pro_definition: "人工智能可以提高效率，创造新的就业机会",
        con_definition: "人工智能会取代大量工作，导致失业率上升",
        max_rounds: 10,
        judge_weight: 0.7,
        audience_weight: 0.3,
        agents: [
          {
            role: "debater",
            stance: "pro",
            model_provider: "openai",
            model_name: "gpt-4",
            style_tag: "rational",
          },
          {
            role: "debater",
            stance: "con",
            model_provider: "openai",
            model_name: "gpt-4",
            style_tag: "aggressive",
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
          {
            role: "audience",
            model_provider: "openai",
            model_name: "gpt-3.5-turbo",
            audience_type: "pragmatic",
          },
        ],
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("message");
    expect(data).toHaveProperty("debate");
    expect(data).toHaveProperty("agents");

    // Verify debate structure
    expect(data.debate).toHaveProperty("id");
    expect(data.debate).toHaveProperty("topic");
    expect(data.debate).toHaveProperty("status");
    expect(data.debate.status).toBe("pending");

    // Verify agents structure
    expect(Array.isArray(data.agents)).toBe(true);
    expect(data.agents.length).toBe(5); // 2 debaters + 1 judge + 2 audience
    expect(data.agents[0]).toHaveProperty("id");
    expect(data.agents[0]).toHaveProperty("role");
    expect(data.agents[0]).toHaveProperty("model_provider");
    expect(data.agents[0]).toHaveProperty("model_name");
  });

  it("should accept minimal valid request with default values", async () => {
    const response = await fetch(`${baseUrl}/api/debates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: "测试辩题",
        max_rounds: 5,
        judge_weight: 0.8,
        audience_weight: 0.2,
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

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.debate.topic).toBe("测试辩题");
  });
});
