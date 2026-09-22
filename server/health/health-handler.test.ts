import { describe, expect, it, vi } from "vitest";

import {
  createLivenessHandler,
  createReadinessHandler,
} from "./health-handler";

describe("health handlers", () => {
  it("reports liveness without evaluating dependencies", async () => {
    const response = await createLivenessHandler()();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "alive" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("reports ready after every bounded non-destructive check succeeds", async () => {
    const checkConfiguration = vi.fn().mockResolvedValue(undefined);
    const checkDatabase = vi.fn().mockResolvedValue(undefined);
    const response = await createReadinessHandler({
      checks: [
        { name: "configuration", run: checkConfiguration },
        { name: "database", run: checkDatabase },
      ],
      timeoutMs: 100,
      reportFailure: vi.fn(),
    })();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready" });
    expect(checkConfiguration).toHaveBeenCalledOnce();
    expect(checkDatabase).toHaveBeenCalledOnce();
  });

  it("returns an opaque unavailable response when a dependency fails", async () => {
    const reportFailure = vi.fn();
    const response = await createReadinessHandler({
      checks: [{
        name: "database",
        run: vi.fn().mockRejectedValue(
          new Error("postgresql://admin:secret@internal-db.example/projectscout"),
        ),
      }],
      timeoutMs: 100,
      reportFailure,
    })();
    const responseText = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(responseText)).toEqual({ status: "unavailable" });
    expect(responseText).not.toContain("secret");
    expect(responseText).not.toContain("internal-db");
    expect(reportFailure).toHaveBeenCalledWith(expect.objectContaining({
      failedChecks: ["database"],
      timedOutChecks: [],
    }));
  });

  it("stops waiting for a dependency at the strict readiness deadline", async () => {
    let aborted = false;
    const startedAt = performance.now();
    const response = await createReadinessHandler({
      checks: [{
        name: "database",
        run: (signal) => new Promise(() => {
          signal.addEventListener("abort", () => {
            aborted = true;
          }, { once: true });
        }),
      }],
      timeoutMs: 20,
      reportFailure: vi.fn(),
    })();

    expect(response.status).toBe(503);
    expect(aborted).toBe(true);
    expect(performance.now() - startedAt).toBeLessThan(250);
  });
});
