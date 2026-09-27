import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOptionalAuthIdentity, redirect } = vi.hoisted(() => ({
  getOptionalAuthIdentity: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/server/auth/get-auth-identity", () => ({
  getOptionalAuthIdentity,
}));
vi.mock("next/navigation", () => ({ redirect }));

import Home from "./page";

describe("home route", () => {
  beforeEach(() => {
    getOptionalAuthIdentity.mockReset();
    redirect.mockReset();
  });

  it("redirects an authenticated request before rendering the landing page", async () => {
    getOptionalAuthIdentity.mockResolvedValue({
      id: "4f909adc-26b4-45d1-aa3c-13cd7649794a",
      email: "scout@example.test",
      initials: "S",
    });

    redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(Home()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/research");
  });

  it("renders the landing page for an unauthenticated request", async () => {
    getOptionalAuthIdentity.mockResolvedValue(null);

    const result = await Home();

    expect(result.type.name).toBe("LandingPage");
    expect(redirect).not.toHaveBeenCalled();
  });
});
