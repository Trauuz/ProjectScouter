import type {
  ProviderOperation,
  ProviderUsageSummary,
} from "../domain/provider-usage";

type SummaryReader = {
  summarize(
    period: "day" | "month",
    now?: Date,
    operation?: ProviderOperation,
  ): Promise<ProviderUsageSummary>;
};

type AlertPolicy = Readonly<{
  warningFraction: number;
  dailySpendCeilingMicrodollars: number;
  monthlySpendCeilingMicrodollars: number;
  researchMonthlyCreditCeiling: number;
  recommendationDailyCallCeiling: number;
}>;

type WarningLogger = {
  warn(event: string, fields: Readonly<Record<string, unknown>>): void;
};

function elapsedDayFraction(now: Date): number {
  const elapsed =
    now.getUTCHours() * 60 * 60 * 1_000 +
    now.getUTCMinutes() * 60 * 1_000 +
    now.getUTCSeconds() * 1_000 +
    now.getUTCMilliseconds();
  return Math.max(elapsed / (24 * 60 * 60 * 1_000), 1 / 24);
}

export class ProviderUsageMonitor {
  constructor(
    private readonly summaries: SummaryReader,
    private readonly policy: AlertPolicy,
    private readonly logger: WarningLogger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async checkAfterCompletion(
    provider: string,
    operation: ProviderOperation,
  ): Promise<void> {
    const now = this.now();
    const daily = await this.summaries.summarize("day", now);
    const monthly = await this.summaries.summarize("month", now);
    const quota = await this.summaries.summarize(
      operation === "research" ? "month" : "day",
      now,
      operation,
    );

    this.warnForQuota(provider, operation, quota);
    this.warnForSpendVelocity(provider, daily, now);
    this.warnForMonthlySpend(provider, monthly);
  }

  private warnForQuota(
    provider: string,
    operation: ProviderOperation,
    quota: ProviderUsageSummary,
  ): void {
    const used = operation === "research"
      ? quota.credits
      : quota.completedCount;
    const limit = operation === "research"
      ? this.policy.researchMonthlyCreditCeiling
      : this.policy.recommendationDailyCallCeiling;
    if (used < limit * this.policy.warningFraction) {
      return;
    }
    this.logger.warn("provider.quota.warning", {
      provider,
      quota: operation === "research"
        ? "research_monthly_credits"
        : "recommendation_daily_calls",
      used,
      limit,
      utilizationPercent: Math.round(used / limit * 100),
    });
  }

  private warnForSpendVelocity(
    provider: string,
    daily: ProviderUsageSummary,
    now: Date,
  ): void {
    const projectedMicrodollars = Math.round(
      daily.estimatedCostMicrodollars / elapsedDayFraction(now),
    );
    if (
      projectedMicrodollars <
      this.policy.dailySpendCeilingMicrodollars * this.policy.warningFraction
    ) {
      return;
    }
    this.logger.warn("provider.spend_velocity.warning", {
      provider,
      spentMicrodollars: daily.estimatedCostMicrodollars,
      projectedMicrodollars,
      ceilingMicrodollars: this.policy.dailySpendCeilingMicrodollars,
    });
  }

  private warnForMonthlySpend(
    provider: string,
    monthly: ProviderUsageSummary,
  ): void {
    if (
      monthly.estimatedCostMicrodollars <
      this.policy.monthlySpendCeilingMicrodollars * this.policy.warningFraction
    ) {
      return;
    }
    this.logger.warn("provider.monthly_spend.warning", {
      provider,
      spentMicrodollars: monthly.estimatedCostMicrodollars,
      ceilingMicrodollars: this.policy.monthlySpendCeilingMicrodollars,
    });
  }
}
