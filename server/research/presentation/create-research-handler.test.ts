import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResearchFailure } from "../application/research-errors";
import type { ResearchWorkflow } from "../application/research-ports";
import { VisitorSessionId, type ResearchOwner } from "../domain/research-owner";
import { createResearchPostHandler } from "./create-research-handler";

const workflow: ResearchWorkflow = {
  execute: vi.fn(),
};
const owner: ResearchOwner = {
  sessionId: VisitorSessionId.create(
    "35f406bc-f482-4a23-9106-b9ae6da71b1d",
  ),
  userId: null,
};

describe("createResearchPostHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a cross-origin browser request before spending provider credits", async () => {
    const handler = createResearchPostHandler({
      workflow,
      rateLimiter: { check: vi.fn(() => ({ allowed: true as const })) },
    });
    const request = new Request("http://localhost:3000/api/research", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://malicious.example",
      },
      body: JSON.stringify({ prompt: "A valid project research topic" }),
    });

    const response = await handler(request, owner);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN_ORIGIN");
    expect(workflow.execute).not.toHaveBeenCalled();
  });

  it("rejects an oversized body without parsing or forwarding it", async () => {
    const handler = createResearchPostHandler({
      workflow,
      rateLimiter: { check: vi.fn(() => ({ allowed: true as const })) },
    });
    const request = new Request("http://localhost:3000/api/research", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "4097",
      },
      body: JSON.stringify({ prompt: "A valid project research topic" }),
    });

    const response = await handler(request, owner);
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.error.code).toBe("PAYLOAD_TOO_LARGE");
    expect(workflow.execute).not.toHaveBeenCalled();
  });

  it("rejects content types that only begin with application/json", async () => {
    const handler = createResearchPostHandler({
      workflow,
      rateLimiter: { check: vi.fn(() => ({ allowed: true as const })) },
    });
    const request = new Request("http://localhost:3000/api/research", {
      method: "POST",
      headers: { "content-type": "application/jsonp" },
      body: JSON.stringify({ prompt: "A valid project research topic" }),
    });

    const response = await handler(request, owner);

    expect(response.status).toBe(415);
    expect(workflow.execute).not.toHaveBeenCalled();
  });

  it("preserves the upstream failure chain in development diagnostics", async () => {
    const upstreamReason = new Error(
      "Gemini responded with 400: responseJsonSchema is invalid",
    );
    vi.mocked(workflow.execute).mockRejectedValueOnce(
      new ResearchFailure(
        "UPSTREAM_FAILED",
        "Gemini recommendation generation failed.",
        upstreamReason,
      ),
    );
    const reportFailure = vi.fn();
    const handler = createResearchPostHandler({
      workflow,
      rateLimiter: { check: vi.fn(() => ({ allowed: true as const })) },
      diagnostics: { exposeDetails: true, reportFailure },
    });
    const request = new Request("http://localhost:3000/api/research", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "A valid project research topic" }),
    });

    const response = await handler(request, owner);
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error.message).toBe(
      "A research provider could not complete the request.",
    );
    expect(body.error.details).toContain(
      "Gemini recommendation generation failed",
    );
    expect(body.error.details).toContain("responseJsonSchema is invalid");
    expect(reportFailure).toHaveBeenCalledWith(expect.any(ResearchFailure));
  });

  it("passes the server-owned visitor context through and returns persistence status", async () => {
    const result = {
      report: {
        prompt: "A valid project research topic",
        summary: "A concise research summary.",
        generatedAt: "2026-08-18T00:00:00.000Z",
        sources: [],
        recommendations: [],
      },
      persistence: {
        status: "saved" as const,
        runId: "db19db89-670b-4307-900c-c1a9e80c488a",
      },
    };
    vi.mocked(workflow.execute).mockResolvedValueOnce(result);
    const handler = createResearchPostHandler({
      workflow,
      rateLimiter: { check: vi.fn(() => ({ allowed: true as const })) },
    });
    const request = new Request("http://localhost:3000/api/research", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: result.report.prompt }),
    });

    const response = await handler(request, owner);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(workflow.execute).toHaveBeenCalledWith(
      expect.anything(),
      owner,
      expect.any(AbortSignal),
    );
  });
});
