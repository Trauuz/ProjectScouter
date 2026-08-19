import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getIdentity: vi.fn(),
  getHandler: vi.fn(),
  getVisitorSession: vi.fn(),
}));

vi.mock("@/server/auth/get-auth-identity", () => ({
  getOptionalAuthIdentity: mocks.getIdentity,
}));
vi.mock("@/server/research/composition-root", () => ({
  getResearchPostHandler: mocks.getHandler,
}));
vi.mock("@/server/research/presentation/visitor-session", () => ({
  getOrCreateVisitorSession: mocks.getVisitorSession,
}));

import { POST } from "./route";

describe("POST /api/research authentication", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 before creating the research workflow for an anonymous request", async () => {
    mocks.getIdentity.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "A finance tracker for businesses" }),
    }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTH_REQUIRED", retryable: true },
    });
    expect(mocks.getVisitorSession).not.toHaveBeenCalled();
    expect(mocks.getHandler).not.toHaveBeenCalled();
  });

  it("passes the verified user and server-owned visitor session to research", async () => {
    const sessionId = { toString: () => "visitor-id" };
    const handler = vi.fn(async () => Response.json({ ok: true }));
    mocks.getIdentity.mockResolvedValue({
      id: "f965595b-47ae-4d97-8b3a-9033379d184f",
      email: "student@example.com",
      initials: "S",
    });
    mocks.getVisitorSession.mockResolvedValue(sessionId);
    mocks.getHandler.mockReturnValue(handler);
    const request = new Request("http://localhost/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "A finance tracker for businesses" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith(request, {
      sessionId,
      userId: "f965595b-47ae-4d97-8b3a-9033379d184f",
    });
  });

  it("logs startup failures server-side while returning structured JSON", async () => {
    const failure = new Error("Provider factory could not start");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getIdentity.mockResolvedValue({
      id: "f965595b-47ae-4d97-8b3a-9033379d184f",
      email: "student@example.com",
      initials: "S",
    });
    mocks.getVisitorSession.mockResolvedValue({ toString: () => "visitor-id" });
    mocks.getHandler.mockImplementation(() => {
      throw failure;
    });

    const response = await POST(new Request("http://localhost/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "A finance tracker for businesses" }),
    }));

    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(consoleError).toHaveBeenCalledWith(
      "[research-api] Startup failed",
      failure,
    );
  });
});
