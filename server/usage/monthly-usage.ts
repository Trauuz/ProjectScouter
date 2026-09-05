export const MONTHLY_RESEARCH_LIMIT = 10;

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

export function monthlyUsage(
  used: number,
  now: Date,
  limit = MONTHLY_RESEARCH_LIMIT,
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
