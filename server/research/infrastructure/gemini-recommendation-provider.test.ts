import { afterEach, describe, expect, it, vi } from "vitest";

import { ResearchFailure } from "../application/research-errors";
import { ResearchPrompt } from "../domain/research-prompt";
import type { ResearchBundle } from "../domain/research-report";
import { GeminiRecommendationProvider } from "./gemini-recommendation-provider";

const research: ResearchBundle = {
  summary: "Businesses need clearer cash-flow visibility.",
  sources: [
    {
      id: "src-1",
      title: "Small-business cash-flow study",
      url: "https://example.com/cash-flow",
      snippet: "Owners struggle to forecast irregular payments.",
      publishedAt: "2026-08-01",
    },
  ],
};

const recommendations = [1, 2, 3].map((number) => ({
  title: `Cash-flow direction ${number}`,
  targetUser: "Small-business owners",
  problem: "Irregular payments make short-term cash planning difficult.",
  proposedSolution: "Forecast incoming and outgoing cash on a weekly timeline.",
  mvpFeatures: ["Invoice timeline", "Expense forecast", "Cash alerts"],
  scopeEstimate: "small",
  similarProducts: ["QuickBooks"],
  differentiation: "A focused weekly forecast instead of full accounting.",
  risks: ["Forecast quality depends on complete invoice data."],
  validationExperiment: "Interview five owners and test a spreadsheet prototype.",
  evidenceSourceIds: ["src-1"],
  evidenceStrength: "medium",
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GeminiRecommendationProvider", () => {
  it("asks Gemini for recommendation JSON that matches the application contract", async () => {
    const fetchMock = vi.fn(
      async (
        input: string | URL | Request,
        init?: RequestInit,
      ): Promise<Response> => {
        void input;
        void init;

        return Response.json({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ recommendations }) }],
              },
            },
          ],
        });
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    const provider = new GeminiRecommendationProvider("test-key", "gemini-test");

    const result = await provider.generate(
      ResearchPrompt.create("Finance tracking for small businesses"),
      research,
      new AbortController().signal,
    );

    const request = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body));
    const responseSchema = body.generationConfig.responseJsonSchema;

    expect(responseSchema.properties.recommendations.minItems).toBe(3);
    expect(responseSchema.properties.recommendations.maxItems).toBe(3);
    expect(
      responseSchema.properties.recommendations.items.properties.evidenceSourceIds
        .items.enum,
    ).toEqual(["src-1"]);
    expect(JSON.stringify(responseSchema)).not.toContain("minLength");
    expect(result).toHaveLength(3);
  });

  it("preserves Gemini's HTTP error for server-side diagnostics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: { message: "The requested model is not available." } },
          { status: 404, statusText: "Not Found" },
        ),
      ),
    );
    const provider = new GeminiRecommendationProvider("test-key", "retired-model");

    const request = provider.generate(
      ResearchPrompt.create("Finance tracking for small businesses"),
      research,
      new AbortController().signal,
    );

    await expect(request).rejects.toMatchObject({
      code: "UPSTREAM_FAILED",
      cause: expect.objectContaining({
        message: expect.stringContaining(
          "404 Not Found: The requested model is not available.",
        ),
      }),
    } satisfies Partial<ResearchFailure>);
  });
});
