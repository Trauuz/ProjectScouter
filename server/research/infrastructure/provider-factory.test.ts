import { describe, expect, it } from "vitest";

import { GeminiRecommendationProvider } from "./gemini-recommendation-provider";
import { OpenAiRecommendationProvider } from "./openai-recommendation-provider";
import { PerplexityResearchProvider } from "./perplexity-research-provider";
import {
  createRecommendationProvider,
  createResearchProvider,
} from "./provider-factory";
import { TavilyResearchProvider } from "./tavily-research-provider";

describe("provider factory", () => {
  it("keeps SDK construction behind the provider-neutral recommendation port", () => {
    const provider = createRecommendationProvider({
      provider: "openai",
      apiKey: "recommendation-key",
      model: "gpt-5.6-terra",
    });

    expect(provider).toBeInstanceOf(OpenAiRecommendationProvider);
  });

  it("can construct the Gemini recommendation adapter from neutral settings", () => {
    const provider = createRecommendationProvider({
      provider: "gemini",
      apiKey: "recommendation-key",
      model: "gemini-2.5-flash",
    });

    expect(provider).toBeInstanceOf(GeminiRecommendationProvider);
  });

  it("keeps SDK construction behind the provider-neutral research port", () => {
    const provider = createResearchProvider({
      provider: "perplexity",
      apiKey: "perplexity-key",
    });

    expect(provider).toBeInstanceOf(PerplexityResearchProvider);
  });

  it("can construct the Tavily research adapter from neutral settings", () => {
    const provider = createResearchProvider({
      provider: "tavily",
      apiKey: "tavily-key",
    });

    expect(provider).toBeInstanceOf(TavilyResearchProvider);
  });
});
