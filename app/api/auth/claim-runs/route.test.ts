import { describe, expect, it, vi } from "vitest";

import { VisitorSessionId } from "../../../../server/research/domain/research-owner";
import { createClaimRunsPostHandler } from "./claim-runs-handler";

const USER_ID = "be3cf01c-0496-4e47-895f-bbe3227698b7";
const SESSION_ID = VisitorSessionId.create(
  "5193e075-6d8f-4995-9cac-7638661574cd",
);

function request(origin = "https://projectscout.test"): Request {
  return new Request("https://projectscout.test/api/auth/claim-runs", {
    method: "POST",
    headers: { origin },
  });
}

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    getIdentity: vi.fn().mockResolvedValue({ id: USER_ID }),
    getVisitorSession: vi.fn().mockResolvedValue(SESSION_ID),
    attachResearchRuns: vi.fn().mockResolvedValue(2),
    rotateVisitorSession: vi.fn().mockResolvedValue(undefined),
    reportFailure: vi.fn(),
    ...overrides,
  };
}

describe("POST /api/auth/claim-runs", () => {
  it("returns the exact attached count and rotates the visitor session", async () => {
    const deps = dependencies();
    const response = await createClaimRunsPostHandler(deps)(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ attached: 2 });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(deps.attachResearchRuns).toHaveBeenCalledWith(SESSION_ID, USER_ID);
    expect(deps.rotateVisitorSession).toHaveBeenCalledTimes(1);
    expect(deps.attachResearchRuns.mock.invocationCallOrder[0]).toBeLessThan(
      deps.rotateVisitorSession.mock.invocationCallOrder[0],
    );
  });

  it("returns 401 without claiming or rotating when authentication is absent", async () => {
    const deps = dependencies({ getIdentity: vi.fn().mockResolvedValue(null) });
    const response = await createClaimRunsPostHandler(deps)(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "AUTH_REQUIRED" });
    expect(deps.attachResearchRuns).not.toHaveBeenCalled();
    expect(deps.rotateVisitorSession).not.toHaveBeenCalled();
  });

  it("rejects cross-origin claims before accessing account data", async () => {
    const deps = dependencies();
    const response = await createClaimRunsPostHandler(deps)(
      request("https://attacker.test"),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "FORBIDDEN_ORIGIN" });
    expect(deps.getIdentity).not.toHaveBeenCalled();
  });

  it("does not rotate the visitor session when the database claim fails", async () => {
    const deps = dependencies({
      attachResearchRuns: vi.fn().mockRejectedValue(new Error("database down")),
    });
    const response = await createClaimRunsPostHandler(deps)(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "CLAIM_FAILED" });
    expect(deps.rotateVisitorSession).not.toHaveBeenCalled();
    expect(deps.reportFailure).toHaveBeenCalledTimes(1);
  });
});
