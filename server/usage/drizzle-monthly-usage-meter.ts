import "server-only";

import { and, eq, lt, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { getDatabase, type ProjectScoutDatabase } from "@/server/database/client";
import { accountMonthlyUsage } from "@/server/database/schema";

import {
  ACCOUNT_MONTHLY_RESEARCH_LIMIT,
  GOOGLE_AI_DAILY_RESEARCH_LIMIT,
  TAVILY_API_CREDITS_PER_RESEARCH,
  TAVILY_MONTHLY_APP_CREDIT_LIMIT,
  googleDailyUsagePeriod,
  monthlyUsage,
  monthlyUsagePeriod,
  type MonthlyUsage,
  type MonthlyUsageMeter,
  type MonthlyUsageReservation,
} from "./monthly-usage";

const userIdSchema = z.string().uuid();
const TAVILY_MONTHLY_COUNTER_ID = "00000000-0000-4000-8000-000000000001";
const GOOGLE_DAILY_COUNTER_ID = "00000000-0000-4000-8000-000000000002";

class UsageLimitReached extends Error {
  constructor(readonly reason: "account" | "google-ai" | "tavily") {
    super(`Research usage limit reached: ${reason}`);
  }
}

export class DrizzleMonthlyUsageMeter implements MonthlyUsageMeter {
  constructor(private readonly database: ProjectScoutDatabase = getDatabase()) {}

  async read(userId: string, now = new Date()): Promise<MonthlyUsage> {
    const validUserId = userIdSchema.parse(userId);
    const { periodStart } = monthlyUsagePeriod(now);
    const [row] = await this.database
      .select({ usedCredits: accountMonthlyUsage.usedCredits })
      .from(accountMonthlyUsage)
      .where(and(
        eq(accountMonthlyUsage.userId, validUserId),
        eq(accountMonthlyUsage.periodStart, periodStart),
      ))
      .limit(1);

    return monthlyUsage(row?.usedCredits ?? 0, now);
  }

  async reserve(
    userId: string,
    now = new Date(),
  ): Promise<MonthlyUsageReservation> {
    const validUserId = userIdSchema.parse(userId);
    const { periodStart } = monthlyUsagePeriod(now);
    let accountUsed = 0;

    try {
      await this.database.transaction(async (transaction) => {
        const [accountRow] = await transaction
          .insert(accountMonthlyUsage)
          .values({ userId: validUserId, periodStart, usedCredits: 1 })
          .onConflictDoUpdate({
            target: [accountMonthlyUsage.userId, accountMonthlyUsage.periodStart],
            set: {
              usedCredits: sql`${accountMonthlyUsage.usedCredits} + 1`,
              updatedAt: now,
            },
            setWhere: lt(
              accountMonthlyUsage.usedCredits,
              ACCOUNT_MONTHLY_RESEARCH_LIMIT,
            ),
          })
          .returning({ usedCredits: accountMonthlyUsage.usedCredits });

        if (!accountRow) {
          throw new UsageLimitReached("account");
        }
        accountUsed = accountRow.usedCredits;

        const [tavilyRow] = await transaction
          .insert(accountMonthlyUsage)
          .values({
            userId: TAVILY_MONTHLY_COUNTER_ID,
            periodStart,
            usedCredits: TAVILY_API_CREDITS_PER_RESEARCH,
          })
          .onConflictDoUpdate({
            target: [accountMonthlyUsage.userId, accountMonthlyUsage.periodStart],
            set: {
              usedCredits: sql`${accountMonthlyUsage.usedCredits} + ${TAVILY_API_CREDITS_PER_RESEARCH}`,
              updatedAt: now,
            },
            setWhere: lte(
              accountMonthlyUsage.usedCredits,
              TAVILY_MONTHLY_APP_CREDIT_LIMIT - TAVILY_API_CREDITS_PER_RESEARCH,
            ),
          })
          .returning({ usedCredits: accountMonthlyUsage.usedCredits });

        if (!tavilyRow) {
          throw new UsageLimitReached("tavily");
        }

        const [googleRow] = await transaction
          .insert(accountMonthlyUsage)
          .values({
            userId: GOOGLE_DAILY_COUNTER_ID,
            periodStart: googleDailyUsagePeriod(now),
            usedCredits: 1,
          })
          .onConflictDoUpdate({
            target: [accountMonthlyUsage.userId, accountMonthlyUsage.periodStart],
            set: {
              usedCredits: sql`${accountMonthlyUsage.usedCredits} + 1`,
              updatedAt: now,
            },
            setWhere: lt(
              accountMonthlyUsage.usedCredits,
              GOOGLE_AI_DAILY_RESEARCH_LIMIT,
            ),
          })
          .returning({ usedCredits: accountMonthlyUsage.usedCredits });

        if (!googleRow) {
          throw new UsageLimitReached("google-ai");
        }
      });
    } catch (reason) {
      if (reason instanceof UsageLimitReached) {
        return {
          allowed: false,
          denialReason: reason.reason,
          usage: await this.read(validUserId, now),
        };
      }
      throw reason;
    }

    return { allowed: true, usage: monthlyUsage(accountUsed, now) };
  }
}

let usageMeter: DrizzleMonthlyUsageMeter | undefined;

export function getMonthlyUsageMeter(): DrizzleMonthlyUsageMeter {
  usageMeter ??= new DrizzleMonthlyUsageMeter();
  return usageMeter;
}
