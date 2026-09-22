import { describe, expect, it, vi } from "vitest";

import { createReadinessHandler } from "@/server/health/health-handler";

describe("readiness deployment smoke contract", () => {
  it("allows traffic only when required dependencies are available", async () => {
    const ready = createReadinessHandler({
      checks: [{ name: "database", run: vi.fn().mockResolvedValue(undefined) }],
      timeoutMs: 100,
      reportFailure: vi.fn(),
    });
    const unavailable = createReadinessHandler({
      checks: [{ name: "database", run: vi.fn().mockRejectedValue(new Error("offline")) }],
      timeoutMs: 100,
      reportFailure: vi.fn(),
    });

    expect((await ready()).status).toBe(200);
    expect((await unavailable()).status).toBe(503);
  });
});
