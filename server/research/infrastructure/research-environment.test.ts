import { describe, expect, it } from "vitest";

import { ResearchFailure } from "../application/research-errors";
import { readResearchEnvironment } from "./research-environment";

describe("readResearchEnvironment", () => {
  it("maps neutral recommendation settings without exposing an SDK to composition", () => {
    const environment = readResearchEnvironment({
      RECOMMENDATION_PROVIDER: "openai",
      RECOMMENDATION_API_KEY: "recommendation-key",
      RECOMMENDATION_MODEL: "gpt-5.6-terra",
      RESEARCH_PROVIDER: "perplexity",
      RESEARCH_API_KEY: "perplexity-key",
    });

    expect(environment).toEqual({
      research: {
        provider: "perplexity",
        apiKey: "perplexity-key",
      },
      recommendation: {
        provider: "openai",
        apiKey: "recommendation-key",
        model: "gpt-5.6-terra",
      },
    });
  });

  it("rejects recommendation providers that have no registered adapter", () => {
    expect(() =>
      readResearchEnvironment({
        RECOMMENDATION_PROVIDER: "unknown-provider",
        RECOMMENDATION_API_KEY: "recommendation-key",
        RECOMMENDATION_MODEL: "some-model",
        RESEARCH_PROVIDER: "perplexity",
        RESEARCH_API_KEY: "perplexity-key",
      }),
    ).toThrow(ResearchFailure);
  });

  it("maps Gemini recommendation settings from neutral environment names", () => {
    const environment = readResearchEnvironment({
      RECOMMENDATION_PROVIDER: "gemini",
      RECOMMENDATION_API_KEY: "gemini-key",
      RECOMMENDATION_MODEL: "gemini-2.5-flash",
      RESEARCH_PROVIDER: "perplexity",
      RESEARCH_API_KEY: "perplexity-key",
    });

    expect(environment).toEqual({
      research: {
        provider: "perplexity",
        apiKey: "perplexity-key",
      },
      recommendation: {
        provider: "gemini",
        apiKey: "gemini-key",
        model: "gemini-2.5-flash",
      },
    });
  });

  it("maps Tavily research settings from neutral environment names", () => {
    const environment = readResearchEnvironment({
      RESEARCH_PROVIDER: "tavily",
      RESEARCH_API_KEY: "tavily-key",
      RECOMMENDATION_PROVIDER: "gemini",
      RECOMMENDATION_API_KEY: "gemini-key",
      RECOMMENDATION_MODEL: "gemini-2.5-flash",
    });

    expect(environment).toEqual({
      research: {
        provider: "tavily",
        apiKey: "tavily-key",
      },
      recommendation: {
        provider: "gemini",
        apiKey: "gemini-key",
        model: "gemini-2.5-flash",
      },
    });
  });

  it("keeps Tavily provider-specific keys working during migration", () => {
    const environment = readResearchEnvironment({
      RESEARCH_PROVIDER: "tavily",
      TAVILY_API_KEY: "legacy-tavily-key",
      RECOMMENDATION_PROVIDER: "gemini",
      RECOMMENDATION_API_KEY: "gemini-key",
      RECOMMENDATION_MODEL: "gemini-2.5-flash",
    });

    expect(environment).toEqual({
      research: {
        provider: "tavily",
        apiKey: "legacy-tavily-key",
      },
      recommendation: {
        provider: "gemini",
        apiKey: "gemini-key",
        model: "gemini-2.5-flash",
      },
    });
  });

  it("keeps Gemini provider-specific keys working during migration", () => {
    const environment = readResearchEnvironment({
      RECOMMENDATION_PROVIDER: "gemini",
      GEMINI_API_KEY: "legacy-gemini-key",
      GEMINI_RECOMMENDATION_MODEL: "gemini-2.5-flash",
      RESEARCH_PROVIDER: "perplexity",
      RESEARCH_API_KEY: "perplexity-key",
    });

    expect(environment).toEqual({
      research: {
        provider: "perplexity",
        apiKey: "perplexity-key",
      },
      recommendation: {
        provider: "gemini",
        apiKey: "legacy-gemini-key",
        model: "gemini-2.5-flash",
      },
    });
  });

  it("keeps legacy provider-specific keys working during migration", () => {
    const environment = readResearchEnvironment({
      PERPLEXITY_API_KEY: "legacy-perplexity-key",
      OPENAI_API_KEY: "legacy-openai-key",
      OPENAI_RECOMMENDATION_MODEL: "legacy-model",
    });

    expect(environment).toEqual({
      research: {
        provider: "perplexity",
        apiKey: "legacy-perplexity-key",
      },
      recommendation: {
        provider: "openai",
        apiKey: "legacy-openai-key",
        model: "legacy-model",
      },
    });
  });
});
