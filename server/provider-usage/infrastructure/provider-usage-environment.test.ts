import { describe, expect, it } from "vitest";

import {
  ProviderUsageConfigurationError,
  readProviderUsageEnvironment,
} from "./provider-usage-environment";

const validEnvironment = {
  ACCOUNT_MONTHLY_RESEARCH_LIMIT: "5",
  RESEARCH_PROVIDER_MONTHLY_CREDIT_CEILING: "900",
  RESEARCH_PROVIDER_CREDITS_PER_CALL: "2",
  RECOMMENDATION_PROVIDER_DAILY_CALL_CEILING: "10",
  PROVIDER_USAGE_WARNING_PERCENT: "80",
  PROVIDER_DAILY_SPEND_CEILING_MICRODOLLARS: "500000",
  PROVIDER_MONTHLY_SPEND_CEILING_MICRODOLLARS: "10000000",
  RESEARCH_PROVIDER_REQUEST_MICRODOLLARS: "0",
  RESEARCH_PROVIDER_INPUT_MICRODOLLARS_PER_MILLION_TOKENS: "0",
  RESEARCH_PROVIDER_OUTPUT_MICRODOLLARS_PER_MILLION_TOKENS: "0",
  RESEARCH_PROVIDER_MICRODOLLARS_PER_CREDIT: "8000",
  RECOMMENDATION_PROVIDER_REQUEST_MICRODOLLARS: "0",
  RECOMMENDATION_PROVIDER_INPUT_MICRODOLLARS_PER_MILLION_TOKENS: "2000000",
  RECOMMENDATION_PROVIDER_OUTPUT_MICRODOLLARS_PER_MILLION_TOKENS: "8000000",
  RECOMMENDATION_PROVIDER_MICRODOLLARS_PER_CREDIT: "0",
};

describe("readProviderUsageEnvironment", () => {
  it("parses explicit ceilings, alert threshold, and pricing", () => {
    expect(readProviderUsageEnvironment(validEnvironment)).toMatchObject({
      limits: {
        accountMonthlyResearch: 5,
        researchMonthlyCredits: 900,
        researchCreditsPerCall: 2,
        recommendationDailyCalls: 10,
      },
      alerts: {
        warningFraction: 0.8,
        dailySpendCeilingMicrodollars: 500_000,
        monthlySpendCeilingMicrodollars: 10_000_000,
      },
    });
  });

  it("rejects missing and internally inconsistent production limits", () => {
    expect(() => readProviderUsageEnvironment({})).toThrow(
      ProviderUsageConfigurationError,
    );
    expect(() => readProviderUsageEnvironment({
      ...validEnvironment,
      PROVIDER_MONTHLY_SPEND_CEILING_MICRODOLLARS: "100",
    })).toThrow(/monthly spend ceiling/i);
  });
});
