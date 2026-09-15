import { describe, expect, it, vi } from "vitest";

import { createAccountDeletionRetryHandler } from "./account-deletion-retry-handler";

function request(secret = "correct-secret"): Request {
  return new Request("https://projectscout.test/api/internal/account-deletions", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
}

describe("POST /api/internal/account-deletions", () => {
  it("rejects unauthorized retry requests", async () => {
    const retry = vi.fn();
    const response = await createAccountDeletionRetryHandler({
      expectedSecret: "correct-secret",
      retry,
      reportFailure: vi.fn(),
    })(request("wrong-secret"));

    expect(response.status).toBe(401);
    expect(retry).not.toHaveBeenCalled();
  });

  it("returns an operator-visible sanitized retry summary", async () => {
    const retry = vi.fn().mockResolvedValue({
      processed: 2,
      completed: 1,
      failures: [{
        requestId: "ef278f53-0eab-42c4-a50c-7761d9006b2d",
        step: "delete_authentication",
        errorCode: "AUTH_DELETION_FAILED",
      }],
    });
    const response = await createAccountDeletionRetryHandler({
      expectedSecret: "correct-secret",
      retry,
      reportFailure: vi.fn(),
    })(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      processed: 2,
      completed: 1,
      failures: [{
        requestId: "ef278f53-0eab-42c4-a50c-7761d9006b2d",
        step: "delete_authentication",
        errorCode: "AUTH_DELETION_FAILED",
      }],
    });
  });

  it("returns a controlled retryable failure without leaking internals", async () => {
    const reportFailure = vi.fn();
    const response = await createAccountDeletionRetryHandler({
      expectedSecret: "correct-secret",
      retry: vi.fn().mockRejectedValue(new Error("database password leaked here")),
      reportFailure,
    })(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "DELETION_RETRY_UNAVAILABLE" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(reportFailure).toHaveBeenCalledOnce();
  });
});
