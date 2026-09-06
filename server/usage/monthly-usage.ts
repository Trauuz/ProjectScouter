export const ACCOUNT_MONTHLY_RESEARCH_LIMIT = 10;

// ProjectScout makes one advanced Tavily search (2 credits) and one Gemini
// generation per research run. Tavily's free plan includes 1,000 credits each
// month; keeping 100 credits unallocated leaves room for diagnostics and other
// key usage outside this application.
export const TAVILY_API_CREDITS_PER_RESEARCH = 2;
export const TAVILY_MONTHLY_APP_CREDIT_LIMIT = 900;

// Google publishes project-specific free-tier limits in AI Studio rather than a
// single guaranteed RPD value. This deliberately conservative shared ceiling
// complements the request burst limiter and can safely serve a small free beta.
export const GOOGLE_AI_DAILY_RESEARCH_LIMIT = 10;

export type UsageDenialReason = "account" | "google-ai" | "tavily";

export type MonthlyUsage = {
  limit: number;
  used: number;
  remaining: number;
  periodStart: string;
  resetsAt: string;
};

export type MonthlyUsageReservation = {
  allowed: boolean;
  usage: MonthlyUsage;
  denialReason?: UsageDenialReason;
};

export type MonthlyUsageMeter = {
  read(userId: string, now?: Date): Promise<MonthlyUsage>;
  reserve(userId: string, now?: Date): Promise<MonthlyUsageReservation>;
};

export function monthlyUsagePeriod(now: Date): {
  periodStart: string;
  resetsAt: string;
} {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const periodStart = new Date(Date.UTC(year, month, 1));
  const resetsAt = new Date(Date.UTC(year, month + 1, 1));

  return {
    periodStart: periodStart.toISOString().slice(0, 10),
    resetsAt: resetsAt.toISOString(),
  };
}

export function googleDailyUsagePeriod(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function monthlyUsage(
  used: number,
  now: Date,
  limit = ACCOUNT_MONTHLY_RESEARCH_LIMIT,
): MonthlyUsage {
  const period = monthlyUsagePeriod(now);
  const safeUsed = Math.max(0, Math.trunc(used));

  return {
    ...period,
    limit,
    used: safeUsed,
    remaining: Math.max(0, limit - safeUsed),
  };
}
