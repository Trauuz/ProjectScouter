import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { observeRoute } from "./observe-route";
import { StructuredLogger } from "./structured-logger";

describe("observeRoute", () => {
  it("returns a correlation header and emits request count and latency metrics", async () => {
    const lines: string[] = [];
    const logger = new StructuredLogger((line) => lines.push(line));
    const handler = observeRoute(
      "/api/example",
      async () => Response.json({ error: "safe" }, { status: 503 }),
      logger,
    );

    const response = await handler(new Request("https://projectscout.test/api/example"));

    expect(response.headers.get("X-Correlation-ID")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    const events = lines.map((line) => JSON.parse(line));
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        event: "metric",
        metric: "api.request.count",
        route: "/api/example",
        value: 1,
      }),
      expect.objectContaining({
        event: "metric",
        metric: "api.request.latency_ms",
        route: "/api/example",
        durationMs: expect.any(Number),
      }),
    ]));
    expect(new Set(events.map((event) => event.requestId)).size).toBe(1);
  });
});
