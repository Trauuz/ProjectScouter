import { describe, expect, it, vi } from "vitest";

import {
  RESEARCH_VISITOR_COOKIE,
  resolveVisitorSession,
} from "./visitor-session";

describe("resolveVisitorSession", () => {
  it("reuses a valid HTTP-only visitor cookie", () => {
    const set = vi.fn();
    const sessionId = resolveVisitorSession(
      {
        get: vi.fn(() => ({
          name: RESEARCH_VISITOR_COOKIE,
          value: "35f406bc-f482-4a23-9106-b9ae6da71b1d",
        })),
        set,
      },
      false,
    );

    expect(sessionId.toString()).toBe("35f406bc-f482-4a23-9106-b9ae6da71b1d");
    expect(set).not.toHaveBeenCalled();
  });

  it("replaces an invalid cookie with a secure visitor identifier", () => {
    const set = vi.fn();
    const sessionId = resolveVisitorSession(
      {
        get: vi.fn(() => ({
          name: RESEARCH_VISITOR_COOKIE,
          value: "attacker-controlled-session",
        })),
        set,
      },
      true,
    );

    expect(sessionId.toString()).toMatch(/^[0-9a-f-]{36}$/);
    expect(set).toHaveBeenCalledWith(RESEARCH_VISITOR_COOKIE, sessionId.toString(), {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      priority: "high",
    });
  });
});
