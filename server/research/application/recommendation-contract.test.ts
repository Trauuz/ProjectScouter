import { describe, expect, it } from "vitest";

import { createRecommendationSchema } from "./recommendation-contract";

const recommendation = {
  title: "Semester Budget Map",
  targetUser: "First-year college students",
  problem: "Monthly budgets miss irregular semester expenses.",
  proposedSolution: "Plan money around the academic calendar.",
  mvpFeatures: ["Expense calendar", "Budget checkpoints", "Alerts"],
  scopeEstimate: "small",
  similarProducts: ["YNAB"],
  differentiation: "Academic-term planning instead of monthly planning.",
  risks: ["Students may not know future costs."],
  validationExperiment: "Interview five first-year students.",
  evidenceSourceIds: ["src-1"],
  evidenceStrength: "medium",
};

describe("createRecommendationSchema", () => {
  it("requires exactly three ideas and rejects citations outside the evidence bundle", () => {
    const schema = createRecommendationSchema(["src-1", "src-2"]);
    const valid = {
      recommendations: [1, 2, 3].map((number) => ({
        ...recommendation,
        title: `${recommendation.title} ${number}`,
      })),
    };
    const invalid = {
      recommendations: valid.recommendations.map((idea, index) => ({
        ...idea,
        evidenceSourceIds: index === 0 ? ["src-99"] : idea.evidenceSourceIds,
      })),
    };

    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse(invalid).success).toBe(false);
  });
});
