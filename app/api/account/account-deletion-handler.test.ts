import { describe, expect, it, vi } from "vitest";

import { createAccountDeleteHandler } from "./account-deletion-handler";

const USER_ID = "4ba19a1f-48bc-49eb-b9cc-9af80ac03b78";

function request(origin = "https://projectscout.test") {
  return new Request("https://projectscout.test/api/account", {
    method: "DELETE",
    headers: { origin },
  });
}

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    createRequestId: () => "53af9f2c-e3cb-4fbe-8fe5-28de78ef04ca",
    getIdentity: vi.fn().mockResolvedValue({ id: USER_ID }),
    requestDeletion: vi.fn().mockResolvedValue({
      id: "53af9f2c-e3cb-4fbe-8fe5-28de78ef04ca",
      status: "completed",
      nextStep: "complete",
      lastErrorCode: null,
    }),
    reportFailure: vi.fn(),
    ...overrides,
  };
}

describe("DELETE /api/account durable workflow", () => {
  it("returns 204 only after the durable job completes", async () => {
    const deps = dependencies();
    const response = await createAccountDeleteHandler(deps)(request());

    expect(response.status).toBe(204);
    expect(deps.requestDeletion).toHaveBeenCalledWith(
      USER_ID,
      "53af9f2c-e3cb-4fbe-8fe5-28de78ef04ca",
    );
  });

  it("returns a traceable retryable state without exposing the user ID", async () => {
    const deps = dependencies({
      requestDeletion: vi.fn().mockResolvedValue({
        id: "53af9f2c-e3cb-4fbe-8fe5-28de78ef04ca",
        status: "retryable_failed",
        nextStep: "delete_authentication",
        lastErrorCode: "DELETE_DELETE_AUTHENTICATION_FAILED",
      }),
    });
    const response = await createAccountDeleteHandler(deps)(request());
    const text = await response.text();

    expect(response.status).toBe(202);
    expect(JSON.parse(text)).toEqual({
      deletion: {
        requestId: "53af9f2c-e3cb-4fbe-8fe5-28de78ef04ca",
        status: "retryable_failed",
      },
    });
    expect(text).not.toContain(USER_ID);
  });

  it("authenticates before recording a deletion request", async () => {
    const deps = dependencies({ getIdentity: vi.fn().mockResolvedValue(null) });
    const response = await createAccountDeleteHandler(deps)(request());

    expect(response.status).toBe(401);
    expect(deps.requestDeletion).not.toHaveBeenCalled();
  });

  it("reports authentication infrastructure failure without recording a request", async () => {
    const deps = dependencies({
      getIdentity: vi.fn().mockRejectedValue(new Error("auth unavailable")),
    });
    const response = await createAccountDeleteHandler(deps)(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "ACCOUNT_DELETION_UNAVAILABLE",
    });
    expect(deps.requestDeletion).not.toHaveBeenCalled();
    expect(deps.reportFailure).toHaveBeenCalledOnce();
  });

  it("returns a traceable retryable state when durable recording is unavailable", async () => {
    const deps = dependencies({
      requestDeletion: vi.fn().mockRejectedValue(new Error("database unavailable")),
    });
    const response = await createAccountDeleteHandler(deps)(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      deletion: {
        requestId: "53af9f2c-e3cb-4fbe-8fe5-28de78ef04ca",
        status: "retryable_failed",
      },
    });
    expect(deps.reportFailure).toHaveBeenCalledWith(
      "53af9f2c-e3cb-4fbe-8fe5-28de78ef04ca",
      expect.any(Error),
    );
  });

  it("rejects cross-origin requests before authentication", async () => {
    const deps = dependencies();
    const response = await createAccountDeleteHandler(deps)(
      request("https://attacker.test"),
    );

    expect(response.status).toBe(403);
    expect(deps.getIdentity).not.toHaveBeenCalled();
  });
});
