import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  StructuredLogger,
  withObservabilityContext,
} from "./structured-logger";

describe("StructuredLogger", () => {
  it("emits machine-readable correlated events with a one-way user hash", async () => {
    const lines: string[] = [];
    const logger = new StructuredLogger((line) => lines.push(line));
    const userId = "05eb1d2c-a1ec-43f0-8967-24299194382a";

    await withObservabilityContext(
      { requestId: "0bf3e2ef-10d0-4b24-b591-973c2cfdf38f", route: "/api/research" },
      async () => {
        logger.error("research.request.failed", {
          operation: "run_research",
          userId,
          errorCategory: "provider_failure",
          provider: "tavily",
          durationMs: 42,
          retryStatus: "retryable",
          persistenceStatus: "not_started",
        }, new Error("private provider response"));
      },
    );

    expect(lines).toHaveLength(1);
    const event = JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
    expect(event).toMatchObject({
      level: "error",
      event: "research.request.failed",
      requestId: "0bf3e2ef-10d0-4b24-b591-973c2cfdf38f",
      route: "/api/research",
      operation: "run_research",
      errorCategory: "provider_failure",
      provider: "tavily",
      durationMs: 42,
      retryStatus: "retryable",
      persistenceStatus: "not_started",
      errorType: "Error",
    });
    expect(event.userHash).toEqual(expect.any(String));
    expect(lines[0]).not.toContain(userId);
    expect(lines[0]).not.toContain("private provider response");
  });

  it("redacts secrets, authorization data, prompts, response bodies, and email PII", () => {
    const lines: string[] = [];
    const logger = new StructuredLogger((line) => lines.push(line));
    const secrets = [
      "Bearer raw-auth-token",
      "correct horse battery staple",
      "sk-secret-api-key",
      "A full private prompt",
      "provider response body",
      "person@example.com",
      "postgresql://user:password@db.example/app",
    ];

    logger.error("security.redaction.test", {
      authorization: secrets[0],
      password: secrets[1],
      token: secrets[2],
      prompt: secrets[3],
      nested: { responseBody: secrets[4], contact: secrets[5] },
      databaseUrl: secrets[6],
    }, new Error("secret error message"));

    const line = lines[0] ?? "";
    expect(() => JSON.parse(line)).not.toThrow();
    for (const secret of secrets) {
      expect(line).not.toContain(secret);
    }
    expect(line).not.toContain("secret error message");
    expect(line).toContain("[REDACTED]");
  });
});
