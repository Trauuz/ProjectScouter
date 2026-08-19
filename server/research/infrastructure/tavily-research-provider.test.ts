import { afterEach, describe, expect, it, vi } from "vitest";

import { ResearchFailure } from "../application/research-errors";
import { ResearchPrompt } from "../domain/research-prompt";
import {
  extractTavilyResearch,
  TavilyResearchProvider,
} from "./tavily-research-provider";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("extractTavilyResearch", () => {
  it("normalizes Tavily search results into a research bundle", () => {
    const research = extractTavilyResearch({
      answer:
        "Students mention that budgeting apps rarely handle semester timing.",
      results: [
        {
          title: "Budget app reviews",
          url: "https://example.com/reviews?utm_source=test",
          content: "Students want semester-aware planning tools.",
          published_date: "2026-07-10",
        },
        {
          title: "Malformed result",
          url: "not a url",
          content: "This should be skipped.",
        },
      ],
    });

    expect(research).toEqual({
      summary:
        "Students mention that budgeting apps rarely handle semester timing.",
      sources: [
        {
          id: "src-1",
          title: "Budget app reviews",
          url: "https://example.com/reviews",
          snippet: "Students want semester-aware planning tools.",
          publishedAt: "2026-07-10",
        },
      ],
    });
  });

  it("falls back to a concise source-based summary when Tavily omits an answer", () => {
    const research = extractTavilyResearch({
      results: [
        {
          title: "Existing product roundup",
          url: "https://example.com/products",
          content: "Several existing tools target beginner developers.",
        },
      ],
    });

    expect(research.summary).toBe(
      "Tavily found 1 relevant public source for this topic.",
    );
  });

  it("preserves Tavily HTTP diagnostics without exposing credentials", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      detail: "The API key is invalid or expired.",
    }, { status: 401, statusText: "Unauthorized" })));
    const provider = new TavilyResearchProvider("secret-key");

    const failure = await provider.research(
      ResearchPrompt.create("A finance tracker for small businesses"),
      AbortSignal.timeout(1_000),
    ).catch((reason: unknown) => reason);

    expect(failure).toMatchObject({
      code: "UPSTREAM_FAILED",
      message: "Tavily search failed.",
      cause: expect.objectContaining({
        message: expect.stringContaining("401 Unauthorized"),
      }),
    } satisfies Partial<ResearchFailure>);
    expect(String((failure as ResearchFailure).cause)).not.toContain("secret-key");
  });
});
