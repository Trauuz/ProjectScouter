import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getIdentity: vi.fn(),
  getVisitorSession: vi.fn(),
  attach: vi.fn(),
}));

vi.mock("@/server/auth/get-auth-identity", () => ({
  getOptionalAuthIdentity: mocks.getIdentity,
}));
vi.mock("@/server/research/presentation/visitor-session", () => ({
  getOrCreateVisitorSession: mocks.getVisitorSession,
}));
vi.mock("@/server/research/infrastructure/drizzle-research-run-repository", () => ({
  getResearchRunRepository: () => ({
    attachResearchRunsToUser: mocks.attach,
  }),
}));

import { POST } from "./route";

describe("POST /api/auth/claim-runs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not expose or claim runs without a verified user", async () => {
    mocks.getIdentity.mockResolvedValue(null);
    const response = await POST(new Request("http://localhost/api/auth/claim-runs", {
      method: "POST",
    }));

    expect(response.status).toBe(401);
    expect(mocks.getVisitorSession).not.toHaveBeenCalled();
    expect(mocks.attach).not.toHaveBeenCalled();
  });

  it("attaches the server-owned visitor session to the verified user", async () => {
    const visitor = { toString: () => "visitor" };
    mocks.getIdentity.mockResolvedValue({
      id: "f965595b-47ae-4d97-8b3a-9033379d184f",
      email: "student@example.com",
      initials: "S",
    });
    mocks.getVisitorSession.mockResolvedValue(visitor);
    mocks.attach.mockResolvedValue(2);

    const response = await POST(new Request("http://localhost/api/auth/claim-runs", {
      method: "POST",
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ attached: 2 });
    expect(mocks.attach).toHaveBeenCalledWith(
      visitor,
      "f965595b-47ae-4d97-8b3a-9033379d184f",
    );
  });

  it("rejects cross-origin requests", async () => {
    const response = await POST(new Request("http://localhost/api/auth/claim-runs", {
      method: "POST",
      headers: { Origin: "https://attacker.example" },
    }));

    expect(response.status).toBe(403);
    expect(mocks.getIdentity).not.toHaveBeenCalled();
  });
});
