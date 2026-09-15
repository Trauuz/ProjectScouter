import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ResearchFailure } from "../research/application/research-errors";
import { ResearchPrompt } from "../research/domain/research-prompt";
import { observeResearchProvider } from "./observed-providers";
import { StructuredLogger, withObservabilityContext } from "./structured-logger";

describe("observeResearchProvider", () => {
  it("emits provider timeout metrics without logging the prompt or response", async () => {
    const lines: string[] = [];
    const logger = new StructuredLogger((line) => lines.push(line));
    const promptText = "A private research prompt that must not be logged";
    const provider = observeResearchProvider(
      {
        research: vi.fn().mockRejectedValue(
          new ResearchFailure("UPSTREAM_TIMEOUT", "raw provider body"),
        ),
      },
      "tavily",
      logger,
    );

    await withObservabilityContext(
      { requestId: crypto.randomUUID(), route: "/api/research" },
      () => expect(provider.research(
        ResearchPrompt.create(promptText),
        new AbortController().signal,
      )).rejects.toThrow(),
    );

    expect(lines.map((line) => JSON.parse(line))).toEqual(expect.arrayContaining([
      expect.objectContaining({
        event: "metric",
        metric: "provider.timeout.count",
        provider: "tavily",
        value: 1,
      }),
      expect.objectContaining({
        event: "provider.request.failed",
        errorCategory: "timeout",
        retryStatus: "retryable",
      }),
    ]));
    expect(lines.join("\n")).not.toContain(promptText);
    expect(lines.join("\n")).not.toContain("raw provider body");
  });
});
