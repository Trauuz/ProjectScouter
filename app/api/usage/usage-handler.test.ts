import { describe, expect, it, vi } from "vitest";

import { observeRoute } from "../../../server/observability/observe-route";
import { StructuredLogger } from "../../../server/observability/structured-logger";

import { createUsageHandler } from "./usage-handler";

const USER_ID = "05eb1d2c-a1ec-43f0-8967-24299194382a";
const CORRELATION_ID = "0bf3e2ef-10d0-4b24-b591-973c2cfdf38f";
const VALID_USAGE = {
  limit: 5,
  used: 2,
  remaining: 3,
  periodStart: "2026-09-01",
  resetsAt: "2026-10-01T00:00:00.000Z",
};

function request(): Request {
  return new Request("https://projectscout.test/api/usage", {
    headers: { "X-Correlation-ID": CORRELATION_ID },
  });
}

async function body(response: Response): Promise<unknown> {
  return response.json();
}

function expectProtected(response: Response): void {
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
  expect(response.headers.get("Content-Security-Policy")).toContain(
    "default-src 'none'",
  );
}

describe("GET /api/usage", () => {
  it("returns 401 without querying usage when unauthenticated", async () => {
    const readUsage = vi.fn();
    const response = await createUsageHandler({
      getIdentity: async () => null,
      readUsage,
    })(request());

    expect(response.status).toBe(401);
    expect(await body(response)).toEqual({ error: "Authentication required." });
    expect(readUsage).not.toHaveBeenCalled();
    expectProtected(response);
  });

  it("returns validated monthly usage for an authenticated user", async () => {
    const response = await createUsageHandler({
      getIdentity: async () => ({ id: USER_ID }),
      readUsage: async () => VALID_USAGE,
    })(request());

    expect(response.status).toBe(200);
    expect(await body(response)).toEqual(VALID_USAGE);
    expectProtected(response);
  });

  it("returns a correlated 503 when the database times out", async () => {
    const lines: string[] = [];
    const logger = new StructuredLogger((line) => lines.push(line));
    const handler = observeRoute(
      "/api/usage",
      createUsageHandler({
        getIdentity: async () => ({ id: USER_ID }),
        readUsage: async () => {
          const timeout = new Error("database address and query leaked");
          timeout.name = "TimeoutError";
          throw timeout;
        },
        logger,
      }),
      logger,
    );

    const response = await handler(request());

    expect(response.status).toBe(503);
    expect(response.headers.get("X-Correlation-ID")).toBe(CORRELATION_ID);
    const responseBody = await body(response);
    expect(responseBody).toEqual({
      error: {
        code: "USAGE_UNAVAILABLE",
        message: "Usage is temporarily unavailable. Please try again.",
        retryable: true,
      },
    });
    expect(lines.map((line) => JSON.parse(line))).toContainEqual(
      expect.objectContaining({
        event: "usage.read.failed",
        requestId: CORRELATION_ID,
        route: "/api/usage",
        errorCategory: "database_timeout",
      }),
    );
    expect(lines.join("\n")).not.toContain("database address");
    expectProtected(response);
  });

  it("returns the same safe 503 for a malformed database result", async () => {
    const response = await createUsageHandler({
      getIdentity: async () => ({ id: USER_ID }),
      readUsage: async () => ({
        ...VALID_USAGE,
        remaining: "configuration=/private/database",
      }),
    })(request());

    expect(response.status).toBe(503);
    const responseBody = await body(response);
    expect(responseBody).toEqual({
      error: {
        code: "USAGE_UNAVAILABLE",
        message: "Usage is temporarily unavailable. Please try again.",
        retryable: true,
      },
    });
    expect(JSON.stringify(responseBody)).not.toContain("database");
    expectProtected(response);
  });

  it("returns the same safe 503 for an unexpected internal error", async () => {
    const response = await createUsageHandler({
      getIdentity: async () => {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
      },
      readUsage: async () => VALID_USAGE,
    })(request());

    expect(response.status).toBe(503);
    const serialized = JSON.stringify(await body(response));
    expect(serialized).toContain("USAGE_UNAVAILABLE");
    expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expectProtected(response);
  });
});
