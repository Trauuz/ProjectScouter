import { describe, expect, it } from "vitest";

import { PERPLEXITY_RESEARCH_INSTRUCTIONS } from "./perplexity-research-provider";
import { TAVILY_RESEARCH_QUERY_GUIDANCE } from "./tavily-research-provider";

describe("research provider privacy guidance", () => {
  it.each([
    PERPLEXITY_RESEARCH_INSTRUCTIONS,
    TAVILY_RESEARCH_QUERY_GUIDANCE,
  ])("asks providers for aggregate evidence without identifying people", (guidance) => {
    expect(guidance).toMatch(/aggregate/i);
    expect(guidance).toMatch(/names/i);
    expect(guidance).toMatch(/usernames/i);
    expect(guidance).toMatch(/contact details/i);
    expect(guidance).toMatch(/attributable quotes/i);
  });
});
