import "server-only";

import { and, eq, lt, sql } from "drizzle-orm";
import { z } from "zod";

import { getDatabase, type ProjectScoutDatabase } from "@/server/database/client";
import { accountMonthlyUsage } from "@/server/database/schema";

import {
  MONTHLY_RESEARCH_LIMIT,
  monthlyUsage,
  monthlyUsagePeriod,
  type MonthlyUsage,
  type MonthlyUsageMeter,
  type MonthlyUsageReservation,
} from "./monthly-usage";

const userIdSchema = z.string().uuid();

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
    const [row] = await this.database
      .insert(accountMonthlyUsage)
      .values({ userId: validUserId, periodStart, usedCredits: 1 })
      .onConflictDoUpdate({
        target: [accountMonthlyUsage.userId, accountMonthlyUsage.periodStart],
        set: {
          usedCredits: sql`${accountMonthlyUsage.usedCredits} + 1`,
          updatedAt: now,
        },
        setWhere: lt(accountMonthlyUsage.usedCredits, MONTHLY_RESEARCH_LIMIT),
      })
      .returning({ usedCredits: accountMonthlyUsage.usedCredits });

    if (!row) {
      return { allowed: false, usage: await this.read(validUserId, now) };
    }

    return { allowed: true, usage: monthlyUsage(row.usedCredits, now) };
  }
}

let usageMeter: DrizzleMonthlyUsageMeter | undefined;

export function getMonthlyUsageMeter(): DrizzleMonthlyUsageMeter {
  usageMeter ??= new DrizzleMonthlyUsageMeter();
  return usageMeter;
}
