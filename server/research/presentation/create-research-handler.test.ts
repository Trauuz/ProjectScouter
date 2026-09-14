import { describe, expect, it, vi } from "vitest";

import { ResearchFailure } from "../application/research-errors";
import type { ResearchWorkflow } from "../application/research-ports";
import { VisitorSessionId } from "../domain/research-owner";
import { MemoryRateLimiter } from "../infrastructure/memory-rate-limiter";
import { createResearchPostHandler } from "./create-research-handler";
import type { MonthlyUsageMeter } from "@/server/usage/monthly-usage";

const AUTHENTICATED_USER_ID = "05eb1d2c-a1ec-43f0-8967-24299194382a";

function researchRequest(forwardedFor: string, realIp: string): Request {
  return new Request("https://projectscout.test/api/research", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": forwardedFor,
      "x-real-ip": realIp,
    },
    body: JSON.stringify({ prompt: "Find a useful project idea" }),
  });
}

const successfulResult = {
  report: {
    prompt: "Find a useful project idea",
    summary: "Summary",
    generatedAt: "2026-09-14T00:00:00.000Z",
    sources: [],
    recommendations: [],
  },
  persistence: {
    status: "saved" as const,
    runId: "b7188e7d-557f-41f5-9bd6-1c1b69507ca4",
  },
};

function authenticatedOwner() {
  return {
    sessionId: VisitorSessionId.create("8b6d910d-84d2-46c8-bc3c-0d6e259202b0"),
    userId: AUTHENTICATED_USER_ID,
  };
}

function usageMeterWith(reservation: {
  complete: () => Promise<void>;
  release: () => Promise<void>;
}): Pick<MonthlyUsageMeter, "reserve"> {
  return {
    reserve: vi.fn().mockResolvedValue({
      allowed: true,
      reservation,
      usage: {
        limit: 5,
        used: 1,
        remaining: 4,
        periodStart: "2026-09-01",
        resetsAt: "2026-10-01T00:00:00.000Z",
      },
    }),
  } as unknown as Pick<MonthlyUsageMeter, "reserve">;
}

function handlerWith(
  workflow: ResearchWorkflow,
  usageMeter: Pick<MonthlyUsageMeter, "reserve">,
) {
  return createResearchPostHandler({
    workflow,
    usageMeter,
    rateLimiter: new MemoryRateLimiter({
      maxRequests: 10,
      windowMs: 60_000,
      now: () => 1_000,
    }),
    diagnostics: { exposeDetails: false, reportFailure: vi.fn() },
  });
}

describe("createResearchPostHandler rate limiting", () => {
  it("blocks research before reserving usage while account deletion is pending", async () => {
    const workflow: ResearchWorkflow = {
      execute: vi.fn().mockResolvedValue(successfulResult),
    };
    const usageMeter = { reserve: vi.fn() };
    const handler = createResearchPostHandler({
      workflow,
      usageMeter: usageMeter as never,
      accountAccess: { canResearch: vi.fn().mockResolvedValue(false) },
      rateLimiter: new MemoryRateLimiter({
        maxRequests: 1,
        windowMs: 60_000,
        now: () => 1_000,
      }),
    });

    const response = await handler(
      researchRequest("198.51.100.10", "198.51.100.11"),
      authenticatedOwner(),
    );

    expect(response.status).toBe(423);
    expect(await response.json()).toEqual({
      error: {
        code: "ACCOUNT_DELETION_PENDING",
        message: "Account deletion is pending. New research is unavailable.",
        retryable: false,
      },
    });
    expect(usageMeter.reserve).not.toHaveBeenCalled();
    expect(workflow.execute).not.toHaveBeenCalled();
  });

  it("does not let an authenticated user bypass the limit with spoofed forwarding headers", async () => {
    const workflow: ResearchWorkflow = {
      execute: vi.fn().mockResolvedValue(successfulResult),
    };
    const handler = createResearchPostHandler({
      workflow,
      rateLimiter: new MemoryRateLimiter({
        maxRequests: 1,
        windowMs: 60_000,
        now: () => 1_000,
      }),
    });
    const owner = authenticatedOwner();

    const firstResponse = await handler(
      researchRequest("198.51.100.10", "198.51.100.11"),
      owner,
    );
    const limitedResponse = await handler(
      researchRequest("203.0.113.20", "203.0.113.21"),
      owner,
    );

    expect(firstResponse.status).toBe(200);
    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.headers.get("Retry-After")).toBe("60");
    const limitedResponseText = await limitedResponse.clone().text();
    expect(await limitedResponse.json()).toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Too many research requests. Please wait before trying again.",
        retryable: true,
      },
    });
    expect(limitedResponseText).not.toContain(AUTHENTICATED_USER_ID);
    expect(workflow.execute).toHaveBeenCalledTimes(1);
  });

  it("completes one reservation after successful persisted research", async () => {
    const reservation = {
      complete: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    const workflow: ResearchWorkflow = {
      execute: vi.fn().mockResolvedValue(successfulResult),
    };

    const response = await handlerWith(
      workflow,
      usageMeterWith(reservation),
    )(researchRequest("198.51.100.10", "198.51.100.11"), authenticatedOwner());

    expect(response.status).toBe(200);
    expect(reservation.complete).toHaveBeenCalledTimes(1);
    expect(reservation.release).not.toHaveBeenCalled();
  });

  it.each([
    [
      "a provider error",
      new ResearchFailure("UPSTREAM_FAILED", "Provider failed."),
    ],
    [
      "a timeout",
      new ResearchFailure("UPSTREAM_TIMEOUT", "Provider timed out."),
    ],
    ["request cancellation", new DOMException("Cancelled", "AbortError")],
    [
      "malformed provider output",
      new ResearchFailure(
        "UPSTREAM_FAILED",
        "Provider returned malformed output.",
      ),
    ],
  ])("releases the reservation after %s", async (_label, failure) => {
    const reservation = {
      complete: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    const workflow: ResearchWorkflow = {
      execute: vi.fn().mockRejectedValue(failure),
    };

    await handlerWith(workflow, usageMeterWith(reservation))(
      researchRequest("198.51.100.10", "198.51.100.11"),
      authenticatedOwner(),
    );

    expect(reservation.release).toHaveBeenCalledTimes(1);
    expect(reservation.complete).not.toHaveBeenCalled();
  });

  it("releases the reservation when persistence fails", async () => {
    const reservation = {
      complete: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
    };
    const workflow: ResearchWorkflow = {
      execute: vi.fn().mockResolvedValue({
        ...successfulResult,
        persistence: { status: "failed" as const },
      }),
    };

    const response = await handlerWith(
      workflow,
      usageMeterWith(reservation),
    )(researchRequest("198.51.100.10", "198.51.100.11"), authenticatedOwner());

    expect(response.status).toBe(200);
    expect(reservation.release).toHaveBeenCalledTimes(1);
    expect(reservation.complete).not.toHaveBeenCalled();
  });
});
