/**
 * Integration Test for Debate Creation Flow
 * Tests the complete end-to-end debate creation process
 *
 * NOTE: These tests are designed to work with a running dev server.
 * To run: Start the dev server with `npm run dev` first, then run tests.
 */

import { describe, it, expect } from "vitest";

describe("Debate Creation Flow - Integration Tests", () => {
  const baseUrl = "http://localhost:3000";

  it("should create debate with all required fields and return valid response", async () => {
    const requestBody = {
      topic: "人工智能是否应该拥有法律人格",
      pro_definition: "人工智能应该拥有法律人格，以便为其行为负责并享有权利",
      con_definition: "人工智能不应该拥有法律人格，因为它们不是有意识的生命体",
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
    };

    const response = await fetch(`${baseUrl}/api/debates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(201);
    const data = await response.json();

    // Verify response structure
    expect(data.id).toBeDefined();
    expect(typeof data.id).toBe("number");
    expect(data.message).toBe("辩论创建成功");

    // Verify debate object
    expect(data.debate).toBeDefined();
    expect(data.debate.id).toBe(data.id);
    expect(data.debate.topic).toBe(requestBody.topic);
    expect(data.debate.pro_definition).toBe(requestBody.pro_definition);
    expect(data.debate.con_definition).toBe(requestBody.con_definition);
    expect(data.debate.max_rounds).toBe(requestBody.max_rounds);
    expect(data.debate.judge_weight).toBe(requestBody.judge_weight);
    expect(data.debate.audience_weight).toBe(requestBody.audience_weight);
    expect(data.debate.status).toBe("pending");
    expect(data.debate.created_at).toBeDefined();

    // Verify agents array
    expect(data.agents).toBeDefined();
    expect(Array.isArray(data.agents)).toBe(true);
    expect(data.agents.length).toBe(5);

    // Verify debater agents
    const debaters = data.agents.filter((a: { role: string }) => a.role === "debater");
    expect(debaters.length).toBe(2);
    expect(debaters[0].stance).toBeDefined();
    expect(debaters[0].model_provider).toBe("openai");
    expect(debaters[0].model_name).toBe("gpt-4");

    // Verify judge agent
    const judges = data.agents.filter((a: { role: string }) => a.role === "judge");
    expect(judges.length).toBe(1);

    // Verify audience agents
    const audiences = data.agents.filter((a: { role: string }) => a.role === "audience");
    expect(audiences.length).toBe(2);
  });

  it("should handle creation with multiple audience agents", async () => {
    const requestBody = {
      topic: "测试辩题",
      max_rounds: 5,
      judge_weight: 0.5,
      audience_weight: 0.5,
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
        // 10 audience agents
        ...Array.from({ length: 10 }, (_, i) => ({
          role: "audience",
          model_provider: "openai",
          model_name: "gpt-3.5-turbo",
          audience_type: ["rational", "pragmatic", "technical", "risk-averse", "emotional"][
            i % 5
          ],
        })),
      ],
    };

    const response = await fetch(`${baseUrl}/api/debates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(201);
    const data = await response.json();

    // Should have 13 agents total (2 debaters + 1 judge + 10 audience)
    expect(data.agents.length).toBe(13);

    const audienceAgents = data.agents.filter((a: { role: string }) => a.role === "audience");
    expect(audienceAgents.length).toBe(10);
  });

  it("should support different model providers", async () => {
    const requestBody = {
      topic: "多模型测试",
      max_rounds: 3,
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
          model_provider: "anthropic",
          model_name: "claude-3-opus",
        },
        {
          role: "judge",
          model_provider: "google",
          model_name: "gemini-pro",
        },
        {
          role: "audience",
          model_provider: "deepseek",
          model_name: "deepseek-chat",
          audience_type: "technical",
        },
      ],
    };

    const response = await fetch(`${baseUrl}/api/debates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    expect(response.status).toBe(201);
    const data = await response.json();

    // Verify each agent has correct model provider
    expect(data.agents[0].model_provider).toBe("openai");
    expect(data.agents[1].model_provider).toBe("anthropic");
    expect(data.agents[2].model_provider).toBe("google");
    expect(data.agents[3].model_provider).toBe("deepseek");
  });

  it("should allow retrieving created debate by ID", async () => {
    // First create a debate
    const requestBody = {
      topic: "测试辩题用于检索",
      max_rounds: 3,
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
        {
          role: "audience",
          model_provider: "openai",
          model_name: "gpt-3.5-turbo",
          audience_type: "rational",
        },
      ],
    };

    const createResponse = await fetch(`${baseUrl}/api/debates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    expect(createResponse.status).toBe(201);
    const createData = await createResponse.json();
    const debateId = createData.id;

    // Now retrieve the debate by ID
    const getResponse = await fetch(`${baseUrl}/api/debates/${debateId}`);
    expect(getResponse.status).toBe(200);

    const getData = await getResponse.json();
    expect(getData.id).toBe(debateId);
    expect(getData.topic).toBe(requestBody.topic);
    expect(getData.agents).toBeDefined();
    expect(getData.agents.length).toBe(4);
  });

  it("should return 404 when retrieving non-existent debate", async () => {
    const response = await fetch(`${baseUrl}/api/debates/999999`);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});
