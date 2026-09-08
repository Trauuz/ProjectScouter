import { describe, expect, it } from "vitest";

import { consumeAuthCallback } from "./auth-callback";

describe("authentication callback feedback", () => {
  it("shows email confirmation feedback once and preserves unrelated query values", () => {
    const callback = consumeAuthCallback(
      "/research",
      new URLSearchParams("auth=confirmed&resume=research-123"),
    );

    expect(callback).toEqual({
      state: "email-confirmed",
      cleanUrl: "/research?resume=research-123",
    });
  });

  it("keeps the existing expired-link and password-recovery states", () => {
    expect(
      consumeAuthCallback(
        "/",
        new URLSearchParams("auth=confirmation-error"),
      ),
    ).toEqual({ state: "confirmation-error", cleanUrl: "/" });

    expect(
      consumeAuthCallback(
        "/",
        new URLSearchParams("auth=update-password"),
      ),
    ).toEqual({ state: "update-password", cleanUrl: "/" });
  });

  it("ignores unrelated authentication query values", () => {
    expect(
      consumeAuthCallback(
        "/research",
        new URLSearchParams("auth=unknown&filter=saved"),
      ),
    ).toBeNull();
  });
});
