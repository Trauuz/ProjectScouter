export type UsageDenialReason =
  | "account"
  | "recommendation-provider"
  | "research-provider";

export type UsageLimits = Readonly<{
  accountMonthlyResearch: number;
  researchMonthlyCredits: number;
  researchCreditsPerCall: number;
  recommendationDailyCalls: number;
}>;

export type MonthlyUsage = {
  limit: number;
  used: number;
  remaining: number;
  periodStart: string;
  resetsAt: string;
};

export type UsageReservationState = "pending" | "completed" | "released";
type TerminalUsageReservationState = Exclude<
  UsageReservationState,
  "pending"
>;
type ReservationTransition = (
  state: TerminalUsageReservationState,
) => Promise<void>;

export class UsageReservation {
  private transitionPromise: Promise<void> | undefined;

  constructor(
    readonly id: string,
    private readonly transition: ReservationTransition,
  ) {}

  complete(): Promise<void> {
    return this.finish("completed");
  }

  release(): Promise<void> {
    return this.finish("released");
  }

  private finish(state: TerminalUsageReservationState): Promise<void> {
    if (this.transitionPromise) {
      return this.transitionPromise;
    }

    const attempt = Promise.resolve().then(() => this.transition(state));
    const guardedAttempt = attempt.catch((reason: unknown) => {
      if (this.transitionPromise === guardedAttempt) {
        this.transitionPromise = undefined;
      }
      throw reason;
    });
    this.transitionPromise = guardedAttempt;
    return guardedAttempt;
  }
}

export type MonthlyUsageReservation =
  | {
      allowed: true;
      usage: MonthlyUsage;
      reservation: UsageReservation;
    }
  | {
      allowed: false;
      usage: MonthlyUsage;
      denialReason: UsageDenialReason;
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
  limit: number,
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
