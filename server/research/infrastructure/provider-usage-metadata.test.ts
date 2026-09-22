import { afterEach, describe, expect, it, vi } from "vitest";

import { ResearchPrompt } from "../domain/research-prompt";
import type { ProjectRecommendation, ResearchBundle } from "../domain/research-report";
import { GeminiRecommendationProvider } from "./gemini-recommendation-provider";
import { OpenAiRecommendationProvider } from "./openai-recommendation-provider";
import { PerplexityResearchProvider } from "./perplexity-research-provider";
import { TavilyResearchProvider } from "./tavily-research-provider";

const prompt = ResearchPrompt.create("Find a useful student project idea");
const research: ResearchBundle = {
  summary: "A synthetic evidence summary.",
  sources: [{
    id: "src-1",
    title: "Synthetic source",
    url: "https://example.test/source",
    snippet: "A synthetic source snippet.",
    publishedAt: null,
  }],
};

function recommendation(index: number): ProjectRecommendation {
  return {
    title: `Project direction ${index}`,
    targetUser: "Student teams testing a workflow",
    problem: "Students need a simpler way to coordinate a repeated task.",
    proposedSolution: "Build a focused prototype and validate it with volunteers.",
    mvpFeatures: ["Intake form", "Task view", "Feedback form"],
    scopeEstimate: "small",
    similarProducts: [],
    differentiation: "Focus on one narrow student workflow for the first test.",
    risks: ["The synthetic evidence may not generalize."],
    validationExperiment: "Test the prototype with five consenting volunteers.",
    evidenceSourceIds: ["src-1"],
    evidenceStrength: "weak",
    weakEvidence: false,
  };
}

const recommendations = [1, 2, 3].map(recommendation);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("provider usage metadata", () => {
  it("captures OpenAI request and token usage", async () => {
    const provider = new OpenAiRecommendationProvider({
      responses: {
        parse: vi.fn().mockResolvedValue({
          id: "openai-request",
          usage: { input_tokens: 120, output_tokens: 45 },
          output_parsed: { recommendations },
        }),
      },
    } as never, "gpt-test");

    await expect(provider.generate(
      prompt,
      research,
      new AbortController().signal,
    )).resolves.toMatchObject({
      usage: {
        providerRequestId: "openai-request",
        inputTokens: 120,
        outputTokens: 45,
        credits: 0,
      },
    });
  });

  it("captures Gemini request and token usage", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      responseId: "gemini-request",
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 40 },
      candidates: [{ content: { parts: [{ text: JSON.stringify({ recommendations }) }] } }],
    }), { status: 200 })));
    const provider = new GeminiRecommendationProvider("fake-key", "gemini-test");

    await expect(provider.generate(
      prompt,
      research,
      new AbortController().signal,
    )).resolves.toMatchObject({
      usage: {
        providerRequestId: "gemini-request",
        inputTokens: 100,
        outputTokens: 40,
      },
    });
  });

  it("captures Tavily request ID and configured search credits", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      request_id: "tavily-request",
      answer: "Synthetic answer",
      results: [{
        title: "Synthetic source",
        url: "https://example.test/source",
        content: "Synthetic snippet",
      }],
    }), { status: 200 })));
    const provider = new TavilyResearchProvider("fake-key", "advanced", 2);

    await expect(provider.research(
      prompt,
      new AbortController().signal,
    )).resolves.toMatchObject({
      usage: {
        providerRequestId: "tavily-request",
        credits: 2,
      },
    });
  });

  it("captures Perplexity request, token usage, and configured credits", async () => {
    const provider = new PerplexityResearchProvider({
      responses: {
        create: vi.fn().mockResolvedValue({
          id: "perplexity-request",
          usage: { input_tokens: 90, output_tokens: 30 },
          output: [{
            type: "search_results",
            results: [{
              title: "Synthetic source",
              url: "https://example.test/source",
              snippet: "Synthetic snippet",
            }],
          }],
        }),
      },
    } as never, "pro-search", 3);

    await expect(provider.research(
      prompt,
      new AbortController().signal,
    )).resolves.toMatchObject({
      usage: {
        providerRequestId: "perplexity-request",
        inputTokens: 90,
        outputTokens: 30,
        credits: 3,
      },
    });
  });
});
