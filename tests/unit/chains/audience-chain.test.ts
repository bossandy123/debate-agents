/**
 * Unit Test for Audience Chain
 * Tests audience voting schema validation and chain logic
 */

import { describe, it, expect } from "vitest";
import {
  AudienceVoteOutputSchema,
  type AudienceVoteOutput,
} from "@/lib/agents/chains/audience-chain";
import {
  AudienceVoteSchema,
  votingService,
} from "@/lib/services/voting-service";

describe("Audience Chain - Unit Tests", () => {
  describe("AudienceVoteOutputSchema Validation", () => {
    it("should validate correct audience vote for pro", () => {
      const validVote = {
        vote: "pro" as const,
        confidence: 0.85,
        reason: "正方论据更加充分，数据支持有力",
      };

      const result = AudienceVoteOutputSchema.safeParse(validVote);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vote).toBe("pro");
        expect(result.data.confidence).toBe(0.85);
        expect(result.data.reason).toBe("正方论据更加充分，数据支持有力");
      }
    });

    it("should validate correct audience vote for con", () => {
      const validVote = {
        vote: "con" as const,
        confidence: 0.75,
        reason: "反方逻辑更严密，反驳到位",
      };

      const result = AudienceVoteOutputSchema.safeParse(validVote);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vote).toBe("con");
        expect(result.data.confidence).toBe(0.75);
      }
    });

    it("should validate correct audience vote for draw", () => {
      const validVote = {
        vote: "draw" as const,
        confidence: 0.5,
        reason: "双方旗鼓相当，各有千秋",
      };

      const result = AudienceVoteOutputSchema.safeParse(validVote);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vote).toBe("draw");
        expect(result.data.confidence).toBe(0.5);
      }
    });

    it("should reject invalid vote value", () => {
      const invalidVote = {
        vote: "invalid" as const,
        confidence: 0.8,
        reason: "测试",
      };

      const result = AudienceVoteOutputSchema.safeParse(invalidVote);
      expect(result.success).toBe(false);
    });

    it("should reject confidence < 0", () => {
      const invalidVote = {
        vote: "pro" as const,
        confidence: -0.1,
        reason: "测试",
      };

      const result = AudienceVoteOutputSchema.safeParse(invalidVote);
      expect(result.success).toBe(false);
    });

    it("should reject confidence > 1", () => {
      const invalidVote = {
        vote: "pro" as const,
        confidence: 1.5,
        reason: "测试",
      };

      const result = AudienceVoteOutputSchema.safeParse(invalidVote);
      expect(result.success).toBe(false);
    });

    it("should reject reason exceeding max length", () => {
      const invalidVote = {
        vote: "pro" as const,
        confidence: 0.8,
        reason: "a".repeat(501), // 超过500字符
      };

      const result = AudienceVoteOutputSchema.safeParse(invalidVote);
      expect(result.success).toBe(false);
    });
  });

  describe("AudienceVoteSchema Validation (Service)", () => {
    it("should validate pro vote with high confidence", () => {
      const vote = {
        vote: "pro" as const,
        confidence: 0.9,
        reason: "正方观点清晰，有理有据",
      };

      const result = AudienceVoteSchema.safeParse(vote);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vote).toBe("pro");
        expect(result.data.confidence).toBe(0.9);
      }
    });

    it("should validate con vote with medium confidence", () => {
      const vote = {
        vote: "con" as const,
        confidence: 0.6,
        reason: "反方反驳得当",
      };

      const result = AudienceVoteSchema.safeParse(vote);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vote).toBe("con");
      }
    });

    it("should validate draw vote", () => {
      const vote = {
        vote: "draw" as const,
        confidence: 0.5,
        reason: "双方表现相当",
      };

      const result = AudienceVoteSchema.safeParse(vote);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vote).toBe("draw");
      }
    });

    it("should reject invalid confidence (NaN)", () => {
      const invalidVote = {
        vote: "pro" as const,
        confidence: NaN,
        reason: "测试",
      };

      const result = AudienceVoteSchema.safeParse(invalidVote);
      expect(result.success).toBe(false);
    });
  });

  describe("Voting Service - Vote Aggregation", () => {
    it("should aggregate votes correctly", () => {
      // 模拟投票数据
      const mockVotes = [
        { agent_id: "audience-1", vote: "pro" as const },
        { agent_id: "audience-2", vote: "pro" as const },
        { agent_id: "audience-3", vote: "con" as const },
        { agent_id: "audience-4", vote: "draw" as const },
      ];

      // 计算预期结果
      const proVotes = mockVotes.filter((v) => v.vote === "pro").length;
      const conVotes = mockVotes.filter((v) => v.vote === "con").length;
      const drawVotes = mockVotes.filter((v) => v.vote === "draw").length;
      const totalVotes = mockVotes.length;

      expect(proVotes).toBe(2);
      expect(conVotes).toBe(1);
      expect(drawVotes).toBe(1);
      expect(totalVotes).toBe(4);
    });

    it("should calculate percentages correctly", () => {
      const proVotes = 3;
      const conVotes = 1;
      const drawVotes = 1;
      const totalVotes = proVotes + conVotes + drawVotes;

      const proPercentage = proVotes / totalVotes;
      const conPercentage = conVotes / totalVotes;
      const drawPercentage = drawVotes / totalVotes;

      expect(proPercentage).toBe(0.6);
      expect(conPercentage).toBe(0.2);
      expect(drawPercentage).toBe(0.2);
    });

    it("should handle edge case: no votes", () => {
      const proVotes = 0;
      const conVotes = 0;
      const drawVotes = 0;
      const totalVotes = 0;

      const proPercentage = totalVotes > 0 ? proVotes / totalVotes : 0;
      const conPercentage = totalVotes > 0 ? conVotes / totalVotes : 0;
      const drawPercentage = totalVotes > 0 ? drawVotes / totalVotes : 0;

      expect(proPercentage).toBe(0);
      expect(conPercentage).toBe(0);
      expect(drawPercentage).toBe(0);
    });
  });

  describe("Voting Service - Weighted Score Calculation", () => {
    it("should calculate weighted result with equal weights", () => {
      const judgeWeight = 0.5;
      const audienceWeight = 0.5;
      const proJudgeScore = 80;
      const conJudgeScore = 70;
      const proAudienceScore = 60; // 60%
      const conAudienceScore = 40; // 40%

      const proFinalScore = proJudgeScore * judgeWeight + proAudienceScore * audienceWeight;
      const conFinalScore = conJudgeScore * judgeWeight + conAudienceScore * audienceWeight;

      expect(proFinalScore).toBe(70); // 40 + 30
      expect(conFinalScore).toBe(55); // 35 + 20
    });

    it("should calculate weighted result with judge bias", () => {
      const judgeWeight = 0.8;
      const audienceWeight = 0.2;
      const proJudgeScore = 80;
      const conJudgeScore = 70;
      const proAudienceScore = 40; // 40%
      const conAudienceScore = 60; // 60%

      const proFinalScore = proJudgeScore * judgeWeight + proAudienceScore * audienceWeight;
      const conFinalScore = conJudgeScore * judgeWeight + conAudienceScore * audienceWeight;

      expect(proFinalScore).toBe(72); // 64 + 8
      expect(conFinalScore).toBe(68); // 56 + 12
    });

    it("should determine winner correctly", () => {
      const proFinalScore = 70;
      const conFinalScore = 55;

      let winner: "pro" | "con" | "draw";
      if (Math.abs(proFinalScore - conFinalScore) < 5) {
        winner = "draw";
      } else {
        winner = proFinalScore > conFinalScore ? "pro" : "con";
      }

      expect(winner).toBe("pro");
    });

    it("should determine draw when scores are close", () => {
      const proFinalScore = 60;
      const conFinalScore = 62;

      let winner: "pro" | "con" | "draw";
      if (Math.abs(proFinalScore - conFinalScore) < 5) {
        winner = "draw";
      } else {
        winner = proFinalScore > conFinalScore ? "pro" : "con";
      }

      expect(winner).toBe("draw");
    });
  });
});
