import { describe, expect, it } from "vitest";

import { extractPerplexityResearch } from "./perplexity-research-provider";

describe("extractPerplexityResearch", () => {
  it("uses search result objects as evidence instead of URLs from model prose", () => {
    const research = extractPerplexityResearch({
      output: [
        {
          type: "search_results",
          results: [
            {
              id: 1,
              title: "Student budgeting discussion",
              url: "https://example.com/discussion",
              snippet: "Students describe irregular semester costs.",
              date: "2026-04-02",
              source: "web",
            },
          ],
        },
        {
          type: "message",
          id: "message-1",
          role: "assistant",
          status: "completed",
          content: [
            {
              type: "output_text",
              text: "The evidence suggests semester-aware budgeting is underserved.",
            },
          ],
        },
      ],
    });

    expect(research.summary).toContain("semester-aware budgeting");
    expect(research.sources[0]?.url).toBe("https://example.com/discussion");
  });
});
