import { describe, expect, it, vi } from "vitest";

import { ResearchFailure } from "../../research/application/research-errors";
import {
  RecordProviderCall,
  type ProviderUsageLedger,
} from "./record-provider-call";
import type { ProviderCallContext } from "../domain/provider-usage";

const context: ProviderCallContext = {
  internalRequestId: "3e7bf841-2618-4a2a-b438-1db311f22646",
  idempotencyKey: "usage:7206b527-d9b0-42e7-87f2-bd78dd354db6:research",
  usageReservationId: "7206b527-d9b0-42e7-87f2-bd78dd354db6",
  userId: "05eb1d2c-a1ec-43f0-8967-24299194382a",
  retryCount: 0,
};

function ledger(): ProviderUsageLedger {
  return {
    begin: vi.fn().mockResolvedValue({ id: "ledger-row", status: "pending" }),
    complete: vi.fn().mockResolvedValue(undefined),
    fail: vi.fn().mockResolvedValue(undefined),
    isReservationReconciled: vi.fn().mockResolvedValue(true),
    summarize: vi.fn(),
  };
}

describe("RecordProviderCall", () => {
  it("records a successful billable call without prompt content or secrets", async () => {
    const usageLedger = ledger();
    const recorder = new RecordProviderCall(usageLedger, {
      provider: "openai",
      operation: "recommendation",
      modelOrMode: "gpt-test",
      pricing: {
        requestMicrodollars: 10,
        inputMicrodollarsPerMillionTokens: 2_000_000,
        outputMicrodollarsPerMillionTokens: 8_000_000,
        microdollarsPerCredit: 0,
      },
    }, () => new Date("2026-09-21T01:02:03.000Z"));

    const result = await recorder.run(context, async () => ({
      value: { recommendations: 3 },
      usage: {
        providerRequestId: "provider-request-123",
        inputTokens: 1_000,
        outputTokens: 250,
        credits: 0,
      },
    }));

    expect(result).toEqual({ recommendations: 3 });
    expect(usageLedger.begin).toHaveBeenCalledWith(expect.objectContaining({
      internalRequestId: context.internalRequestId,
      idempotencyKey: context.idempotencyKey,
      userId: context.userId,
      provider: "openai",
      modelOrMode: "gpt-test",
      retryCount: 0,
      startedAt: new Date("2026-09-21T01:02:03.000Z"),
    }));
    expect(usageLedger.complete).toHaveBeenCalledWith("ledger-row", {
      completedAt: new Date("2026-09-21T01:02:03.000Z"),
      providerRequestId: "provider-request-123",
      inputTokens: 1_000,
      outputTokens: 250,
      credits: 0,
      estimatedCostMicrodollars: 4_010,
    });
    expect(JSON.stringify(vi.mocked(usageLedger.begin).mock.calls)).not.toContain(
      "prompt",
    );
  });

  it("records timeouts as retryable failures without inventing usage", async () => {
    const usageLedger = ledger();
    const recorder = new RecordProviderCall(usageLedger, {
      provider: "tavily",
      operation: "research",
      modelOrMode: "advanced",
      pricing: {
        requestMicrodollars: 0,
        inputMicrodollarsPerMillionTokens: 0,
        outputMicrodollarsPerMillionTokens: 0,
        microdollarsPerCredit: 8_000,
      },
    });
    const timeout = new ResearchFailure("UPSTREAM_TIMEOUT", "timed out");

    await expect(recorder.run(context, () => Promise.reject(timeout)))
      .rejects.toBe(timeout);

    expect(usageLedger.fail).toHaveBeenCalledWith(
      "ledger-row",
      expect.objectContaining({ status: "timed_out" }),
    );
    expect(usageLedger.complete).not.toHaveBeenCalled();
  });

  it("does not issue a duplicate billable request for an existing idempotency key", async () => {
    const usageLedger = ledger();
    vi.mocked(usageLedger.begin).mockResolvedValue({
      id: "existing-row",
      status: "completed",
      created: false,
    });
    const providerCall = vi.fn();
    const recorder = new RecordProviderCall(usageLedger, {
      provider: "openai",
      operation: "recommendation",
      modelOrMode: "gpt-test",
      pricing: {
        requestMicrodollars: 0,
        inputMicrodollarsPerMillionTokens: 0,
        outputMicrodollarsPerMillionTokens: 0,
        microdollarsPerCredit: 0,
      },
    });

    await expect(recorder.run(context, providerCall)).rejects.toMatchObject({
      code: "UPSTREAM_FAILED",
    });
    expect(providerCall).not.toHaveBeenCalled();
    expect(usageLedger.complete).not.toHaveBeenCalled();
  });
});
