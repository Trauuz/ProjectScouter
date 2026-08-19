import { describe, expect, it } from "vitest";

import { ResearchPrompt } from "./research-prompt";

describe("ResearchPrompt", () => {
  it("trims a specific project topic before research begins", () => {
    const prompt = ResearchPrompt.create(
      "  Budgeting tools for first-year college students  ",
    );

    expect(prompt.toString()).toBe(
      "Budgeting tools for first-year college students",
    );
  });
});
