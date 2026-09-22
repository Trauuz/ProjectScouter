import { describe, expect, it, vi } from "vitest";

import { ProviderUsageMonitor } from "./provider-usage-monitor";

describe("ProviderUsageMonitor", () => {
  it("warns before quota exhaustion and when projected daily spend is unsafe", async () => {
    const warn = vi.fn();
    const monitor = new ProviderUsageMonitor(
      {
        summarize: vi.fn().mockResolvedValue({
          period: "day",
          periodStart: "2026-09-21T00:00:00.000Z",
          periodEnd: "2026-09-22T00:00:00.000Z",
          requestCount: 8,
          completedCount: 8,
          failedCount: 0,
          inputTokens: 4_000,
          outputTokens: 2_000,
          credits: 0,
          estimatedCostMicrodollars: 210_000,
          byProvider: [],
        }),
      },
      {
        warningFraction: 0.8,
        dailySpendCeilingMicrodollars: 500_000,
        monthlySpendCeilingMicrodollars: 10_000_000,
        researchMonthlyCreditCeiling: 900,
        recommendationDailyCallCeiling: 10,
      },
      { warn },
      () => new Date("2026-09-21T12:00:00.000Z"),
    );

    await monitor.checkAfterCompletion("openai", "recommendation");

    expect(warn).toHaveBeenCalledWith(
      "provider.quota.warning",
      expect.objectContaining({ quota: "recommendation_daily_calls", used: 8 }),
    );
    expect(warn).toHaveBeenCalledWith(
      "provider.spend_velocity.warning",
      expect.objectContaining({ projectedMicrodollars: 420_000 }),
    );
  });
});
