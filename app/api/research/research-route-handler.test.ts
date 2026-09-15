import { describe, expect, it, vi } from "vitest";

import { ResearchFailure } from "@/server/research/application/research-errors";
import { VisitorSessionId } from "@/server/research/domain/research-owner";
import { createResearchRouteHandler } from "./research-route-handler";

const request = new Request("https://projectscout.test/api/research", { method: "POST" });
const identity = {
  id: "05eb1d2c-a1ec-43f0-8967-24299194382a",
  email: "scout@example.test",
  initials: "S",
};
const sessionId = VisitorSessionId.create("8b6d910d-84d2-46c8-bc3c-0d6e259202b0");

function dependencies(overrides: Partial<Parameters<typeof createResearchRouteHandler>[0]> = {}) {
  return {
    getIdentity: vi.fn().mockResolvedValue(identity),
    getVisitorSession: vi.fn().mockResolvedValue(sessionId),
    getHandler: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(new Response(null, { status: 204 }))),
    observeUser: vi.fn(),
    ...overrides,
  };
}

describe("POST /api/research", () => {
  it("rejects unauthenticated requests without creating a visitor credential", async () => {
    const deps = dependencies({ getIdentity: vi.fn().mockResolvedValue(null) });
    const response = await createResearchRouteHandler(deps)(request);

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("AUTH_REQUIRED");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(deps.getVisitorSession).not.toHaveBeenCalled();
  });

  it("delegates authenticated requests with verified identity and visitor session", async () => {
    const delegate = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    const deps = dependencies({ getHandler: vi.fn().mockReturnValue(delegate) });
    const response = await createResearchRouteHandler(deps)(request);

    expect(response.status).toBe(202);
    expect(delegate).toHaveBeenCalledWith(request, { sessionId, userId: identity.id });
    expect(deps.observeUser).toHaveBeenCalledWith(identity.id);
  });

  it.each([
    [new ResearchFailure("SERVER_MISCONFIGURED", "secret detail"), 500, "SERVER_MISCONFIGURED"],
    [new Error("database connection details"), 502, "UPSTREAM_FAILED"],
  ] as const)("sanitizes route bootstrap failures", async (reason, status, code) => {
    const deps = dependencies({ getVisitorSession: vi.fn().mockRejectedValue(reason) });
    const response = await createResearchRouteHandler(deps)(request);
    const text = await response.text();

    expect(response.status).toBe(status);
    expect(JSON.parse(text).error.code).toBe(code);
    expect(text).not.toContain(reason.message);
  });
});
