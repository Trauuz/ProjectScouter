import { describe, expect, it, vi } from "vitest";

import type { ResearchWorkflow } from "../application/research-ports";
import { VisitorSessionId } from "../domain/research-owner";
import { createResearchPersistenceRetryHandler } from "./create-research-retry-handler";

const RETRY_ID = "2a1a66b1-f065-4334-889e-935b40958580";
const owner = {
  sessionId: VisitorSessionId.create("8b6d910d-84d2-46c8-bc3c-0d6e259202b0"),
  userId: "05eb1d2c-a1ec-43f0-8967-24299194382a",
};
const saved = {
  report: {
    prompt: "Find a useful project idea",
    summary: "Summary",
    generatedAt: "2026-09-15T00:00:00.000Z",
    sources: [],
    recommendations: [],
  },
  persistence: { status: "saved" as const, runId: RETRY_ID },
};

describe("createResearchPersistenceRetryHandler", () => {
  it("materializes a staged report without invoking research providers", async () => {
    const retry = vi.fn().mockResolvedValue(saved);
    const handler = createResearchPersistenceRetryHandler({
      workflow: { execute: vi.fn(), retry } as ResearchWorkflow,
      reportFailure: vi.fn(),
    });

    const response = await handler(RETRY_ID, owner);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(saved);
    expect(retry).toHaveBeenCalledWith(RETRY_ID, owner);
  });

  it("returns an actionable retry response without exposing database details", async () => {
    const reportFailure = vi.fn();
    const handler = createResearchPersistenceRetryHandler({
      workflow: {
        execute: vi.fn(),
        retry: vi.fn().mockRejectedValue(new Error("postgres host secret")),
      } as ResearchWorkflow,
      reportFailure,
    });

    const response = await handler(RETRY_ID, owner);
    const text = await response.clone().text();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: "PERSISTENCE_UNAVAILABLE",
        message: "Your research is still safe, but it could not be saved yet. Please retry saving.",
        retryable: true,
      },
    });
    expect(text).not.toContain("postgres host secret");
    expect(reportFailure).toHaveBeenCalledWith(expect.objectContaining({
      event: "research.persistence.retry_request_failed",
      errorType: "ResearchFailure",
    }));
  });
});
