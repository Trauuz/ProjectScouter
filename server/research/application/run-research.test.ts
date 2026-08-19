import { describe, expect, it, vi } from "vitest";

import { ResearchPrompt } from "../domain/research-prompt";
import type { ProjectRecommendation } from "../domain/research-report";
import type {
  RecommendationProvider,
  ResearchProvider,
} from "./research-ports";
import { RunResearch } from "./run-research";

describe("RunResearch", () => {
  it("researches first and marks recommendations with thin evidence as weak", async () => {
    const calls: string[] = [];
    const researchProvider: ResearchProvider = {
      research: vi.fn(async () => {
        calls.push("research");
        return {
          summary: "Students struggle with irregular semester expenses.",
          sources: [
            {
              id: "src-1",
              title: "Student finance survey",
              url: "https://example.com/survey",
              snippet: "Irregular costs are a repeated complaint.",
              publishedAt: "2026-05-01",
            },
            {
              id: "src-2",
              title: "Budgeting app reviews",
              url: "https://example.com/reviews",
              snippet: "Students want semester-aware planning.",
              publishedAt: null,
            },
          ],
        };
      }),
    };
    const recommendationProvider: RecommendationProvider = {
      generate: vi.fn(async () => {
        calls.push("recommend");
        const recommendation = {
          title: "Semester Budget Map",
          targetUser: "First-year college students",
          problem: "Monthly budgets ignore irregular semester expenses.",
          proposedSolution: "Plan money around the academic calendar.",
          mvpFeatures: ["Expense calendar", "Budget checkpoints", "Alerts"],
          scopeEstimate: "small",
          similarProducts: ["YNAB"],
          differentiation: "Academic-term planning instead of monthly planning.",
          risks: ["Students may not know future costs."],
          validationExperiment: "Interview five first-year students.",
          evidenceSourceIds: ["src-1", "src-2"],
          evidenceStrength: "medium",
          weakEvidence: false,
        } satisfies ProjectRecommendation;

        return [1, 2, 3].map((number) => ({
          ...recommendation,
          title: `${recommendation.title} ${number}`,
        }));
      }),
    };
    const useCase = new RunResearch(
      researchProvider,
      recommendationProvider,
      () => new Date("2026-08-11T00:00:00.000Z"),
    );

    const report = await useCase.execute(
      ResearchPrompt.create("Budgeting tools for first-year college students"),
      AbortSignal.timeout(1_000),
    );

    expect(calls).toEqual(["research", "recommend"]);
    expect(report.summary).toBe(
      "Students struggle with irregular semester expenses.",
    );
    expect(report.generatedAt).toBe("2026-08-11T00:00:00.000Z");
    expect(report.recommendations[0]?.weakEvidence).toBe(true);
  });
});
