/**
 * Unit Test for Judge Chain
 * Tests judge scoring and foul detection logic
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { JudgeScoreSchema, FoulDetectionSchema, scoringService } from "@/lib/services/scoring-service";

describe("Judge Chain - Unit Tests", () => {
  describe("JudgeScoreSchema Validation", () => {
    it("should validate correct judge score data", () => {
      const validScore = {
        logic: 8,
        rebuttal: 7,
        clarity: 9,
        evidence: 6,
        comment: "逻辑清晰，论据充分",
        fouls: [],
      };

      const result = JudgeScoreSchema.safeParse(validScore);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.logic).toBe(8);
        expect(result.data.fouls).toEqual([]);
      }
    });

    it("should accept score with fouls", () => {
      const scoreWithFouls = {
        logic: 5,
        rebuttal: 5,
        clarity: 5,
        evidence: 5,
        comment: "存在人身攻击",
        fouls: ["ad_hominem"],
      };

      const result = JudgeScoreSchema.safeParse(scoreWithFouls);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fouls).toEqual(["ad_hominem"]);
      }
    });

    it("should reject invalid logic score (< 1)", () => {
      const invalidScore = {
        logic: 0,
        rebuttal: 7,
        clarity: 9,
        evidence: 6,
        comment: "测试",
        fouls: [],
      };

      const result = JudgeScoreSchema.safeParse(invalidScore);
      expect(result.success).toBe(false);
    });

    it("should reject invalid evidence score (> 10)", () => {
      const invalidScore = {
        logic: 8,
        rebuttal: 7,
        clarity: 9,
        evidence: 11,
        comment: "测试",
        fouls: [],
      };

      const result = JudgeScoreSchema.safeParse(invalidScore);
      expect(result.success).toBe(false);
    });

    it("should reject invalid foul type", () => {
      const invalidScore = {
        logic: 8,
        rebuttal: 7,
        clarity: 9,
        evidence: 6,
        comment: "测试",
        fouls: ["invalid_foul_type"],
      };

      const result = JudgeScoreSchema.safeParse(invalidScore);
      expect(result.success).toBe(false);
    });
  });

  describe("FoulDetectionSchema Validation", () => {
    it("should validate no foul result", () => {
      const noFoul = {
        has_foul: false,
        foul_type: null,
        reason: null,
      };

      const result = FoulDetectionSchema.safeParse(noFoul);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.has_foul).toBe(false);
        expect(result.data.foul_type).toBeNull();
        expect(result.data.reason).toBeNull();
      }
    });

    it("should validate foul result", () => {
      const foul = {
        has_foul: true,
        foul_type: "ad_hominem",
        reason: "攻击对方人格而非观点",
      };

      const result = FoulDetectionSchema.safeParse(foul);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.has_foul).toBe(true);
        expect(result.data.foul_type).toBe("ad_hominem");
        expect(result.data.reason).toBe("攻击对方人格而非观点");
      }
    });

    it("should reject invalid foul type", () => {
      const invalidFoul = {
        has_foul: true,
        foul_type: "invalid_type",
        reason: "测试",
      };

      const result = FoulDetectionSchema.safeParse(invalidFoul);
      expect(result.success).toBe(false);
    });
  });

  describe("Scoring Service", () => {
    it("should determine pro winner", () => {
      const result = scoringService.determineWinner(25, 20);
      expect(result).toBe("pro");
    });

    it("should determine con winner", () => {
      const result = scoringService.determineWinner(18, 24);
      expect(result).toBe("con");
    });

    it("should determine draw when scores are close", () => {
      const result = scoringService.determineWinner(22, 22.05);
      expect(result).toBe("draw");
    });

    it("should calculate weighted score correctly", () => {
      const result = scoringService.calculateWeightedScore(30, 20, 0.7, 0.3);
      expect(result).toBe(30 * 0.7 + 20 * 0.3); // 27
    });

    it("should apply foul penalty correctly", () => {
      const result = scoringService.applyFoulPenalty(8, 2);
      expect(result).toBe(4); // 8 - 2*2 = 4
    });

    it("should not reduce score below 1 with penalty", () => {
      const result = scoringService.applyFoulPenalty(3, 3);
      expect(result).toBe(1); // 3 - 2*3 = -3, but min is 1
    });

    it("should generate summary for pro winner", () => {
      const summary = scoringService["generateSummary"]("pro", 28, 22);
      expect(summary).toContain("正方");
      expect(summary).toContain("28.0");
      expect(summary).toContain("22.0");
      expect(summary).toContain("6.0");
    });

    it("should generate summary for draw", () => {
      const summary = scoringService["generateSummary"]("draw", 25, 25);
      expect(summary).toContain("平局");
      expect(summary).toContain("25.0");
    });
  });
});
