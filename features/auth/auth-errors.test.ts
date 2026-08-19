import { describe, expect, it } from "vitest";

import { toAuthFailure } from "./auth-errors";

describe("toAuthFailure", () => {
  it("reports missing Supabase configuration without blaming the connection", () => {
    expect(toAuthFailure(new Error("SUPABASE_AUTH_NOT_CONFIGURED"))).toEqual({
      kind: "configuration",
      message:
        "Authentication is not configured. Add the Supabase project URL and publishable key, then restart ProjectScout.",
    });
  });

  it("separates invalid credentials from provider availability", () => {
    expect(toAuthFailure(new Error("Invalid login credentials"))).toMatchObject({
      kind: "credentials",
    });
    expect(toAuthFailure(new TypeError("Failed to fetch"))).toMatchObject({
      kind: "unavailable",
    });
  });

  it("does not mislabel an unknown provider response as a network problem", () => {
    expect(toAuthFailure(new Error("Unexpected provider response"))).toEqual({
      kind: "unknown",
      message:
        "Login could not be completed. Try again, or inspect the authentication response in development logs.",
    });
  });
});
