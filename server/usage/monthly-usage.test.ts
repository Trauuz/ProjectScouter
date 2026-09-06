import { describe, expect, it } from "vitest";

import {
  ACCOUNT_MONTHLY_RESEARCH_LIMIT,
  GOOGLE_AI_DAILY_RESEARCH_LIMIT,
  TAVILY_API_CREDITS_PER_RESEARCH,
  TAVILY_MONTHLY_APP_CREDIT_LIMIT,
  googleDailyUsagePeriod,
  monthlyUsage,
  monthlyUsagePeriod,
} from "./monthly-usage";

describe("research usage policy", () => {
  it("gives each account ten research runs per calendar month", () => {
    const usage = monthlyUsage(3, new Date("2026-09-06T12:00:00.000Z"));

    expect(usage).toMatchObject({
      limit: ACCOUNT_MONTHLY_RESEARCH_LIMIT,
      used: 3,
      remaining: 7,
      periodStart: "2026-09-01",
      resetsAt: "2026-10-01T00:00:00.000Z",
    });
  });

  it("reserves ten percent of Tavily's free monthly credits", () => {
    expect(TAVILY_MONTHLY_APP_CREDIT_LIMIT).toBe(900);
    expect(
      TAVILY_MONTHLY_APP_CREDIT_LIMIT / TAVILY_API_CREDITS_PER_RESEARCH,
    ).toBe(450);
  });

  it("resets Google's daily guard at midnight Pacific time", () => {
    expect(
      googleDailyUsagePeriod(new Date("2026-09-06T06:59:59.000Z")),
    ).toBe("2026-09-05");
    expect(
      googleDailyUsagePeriod(new Date("2026-09-06T07:00:00.000Z")),
    ).toBe("2026-09-06");
    expect(
      monthlyUsagePeriod(new Date("2026-09-30T23:59:59.000Z")).periodStart,
    ).toBe("2026-09-01");
    expect(GOOGLE_AI_DAILY_RESEARCH_LIMIT).toBe(10);
  });
});
