import { describe, expect, it } from "vitest";

import { MemoryRateLimiter } from "./memory-rate-limiter";

describe("MemoryRateLimiter", () => {
  it("blocks the sixth research request within ten minutes", () => {
    const limiter = new MemoryRateLimiter({
      maxRequests: 5,
      windowMs: 600_000,
      now: () => 1_000,
    });

    for (let request = 0; request < 5; request += 1) {
      expect(limiter.check("127.0.0.1").allowed).toBe(true);
    }

    expect(limiter.check("127.0.0.1")).toEqual({
      allowed: false,
      retryAfterSeconds: 600,
    });
  });
});
