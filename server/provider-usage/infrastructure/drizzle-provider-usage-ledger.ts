import "server-only";

import { and, eq, gte, lt, sql } from "drizzle-orm";

import type { ProjectScoutDatabase } from "../../database/client";
import { getDatabase } from "../../database/client";
import { providerUsageLedger } from "../../database/schema";
import type { ProviderUsageLedger } from "../application/record-provider-call";
import type { ProviderUsageSummary } from "../domain/provider-usage";

type BeginInput = Parameters<ProviderUsageLedger["begin"]>[0];
type CompleteInput = Parameters<ProviderUsageLedger["complete"]>[1];
type FailInput = Parameters<ProviderUsageLedger["fail"]>[1];

function periodBounds(period: "day" | "month", now: Date) {
  const start = period === "day"
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = period === "day"
    ? new Date(start.getTime() + 24 * 60 * 60 * 1_000)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export class DrizzleProviderUsageLedger implements ProviderUsageLedger {
  constructor(private readonly database: ProjectScoutDatabase = getDatabase()) {}

  async begin(input: BeginInput) {
    const [created] = await this.database
      .insert(providerUsageLedger)
      .values(input)
      .onConflictDoNothing({
        target: [
          providerUsageLedger.idempotencyKey,
          providerUsageLedger.operation,
        ],
      })
      .returning({
        id: providerUsageLedger.id,
        status: providerUsageLedger.status,
      });
    if (created) {
      return { ...created, created: true };
    }

    await this.database
      .update(providerUsageLedger)
      .set({
        retryCount: sql`greatest(${providerUsageLedger.retryCount}, ${input.retryCount})`,
        updatedAt: new Date(),
      })
      .where(and(
        eq(providerUsageLedger.idempotencyKey, input.idempotencyKey),
        eq(providerUsageLedger.operation, input.operation),
      ));

    const [existing] = await this.database
      .select({
        id: providerUsageLedger.id,
        status: providerUsageLedger.status,
      })
      .from(providerUsageLedger)
      .where(and(
        eq(providerUsageLedger.idempotencyKey, input.idempotencyKey),
        eq(providerUsageLedger.operation, input.operation),
      ))
      .limit(1);
    if (!existing) {
      throw new Error("Provider usage record could not be created or loaded.");
    }
    return { ...existing, created: false };
  }

  async complete(id: string, input: CompleteInput): Promise<void> {
    await this.database
      .update(providerUsageLedger)
      .set({ ...input, status: "completed", updatedAt: input.completedAt })
      .where(and(
        eq(providerUsageLedger.id, id),
        eq(providerUsageLedger.status, "pending"),
      ));
  }

  async fail(id: string, input: FailInput): Promise<void> {
    await this.database
      .update(providerUsageLedger)
      .set({ ...input, updatedAt: input.completedAt })
      .where(and(
        eq(providerUsageLedger.id, id),
        eq(providerUsageLedger.status, "pending"),
      ));
  }

  async isReservationReconciled(reservationId: string): Promise<boolean> {
    const rows = await this.database
      .select({
        operation: providerUsageLedger.operation,
        status: providerUsageLedger.status,
      })
      .from(providerUsageLedger)
      .where(eq(providerUsageLedger.usageReservationId, reservationId));
    const completed = new Set(
      rows
        .filter((row) => row.status === "completed")
        .map((row) => row.operation),
    );
    return completed.has("research") && completed.has("recommendation");
  }

  async summarize(
    period: "day" | "month",
    now = new Date(),
    operation?: "research" | "recommendation",
  ): Promise<ProviderUsageSummary> {
    const { start, end } = periodBounds(period, now);
    const rows = await this.database
      .select({
        provider: providerUsageLedger.provider,
        requestCount: sql<number>`cast(count(*) as integer)`,
        completedCount: sql<number>`cast(count(*) filter (where ${providerUsageLedger.status} = 'completed') as integer)`,
        failedCount: sql<number>`cast(count(*) filter (where ${providerUsageLedger.status} in ('failed', 'timed_out', 'cancelled')) as integer)`,
        inputTokens: sql<number>`cast(coalesce(sum(${providerUsageLedger.inputTokens}), 0) as integer)`,
        outputTokens: sql<number>`cast(coalesce(sum(${providerUsageLedger.outputTokens}), 0) as integer)`,
        credits: sql<number>`cast(coalesce(sum(${providerUsageLedger.credits}), 0) as integer)`,
        estimatedCostMicrodollars: sql<number>`cast(coalesce(sum(${providerUsageLedger.estimatedCostMicrodollars}), 0) as bigint)`,
      })
      .from(providerUsageLedger)
      .where(and(
        gte(providerUsageLedger.startedAt, start),
        lt(providerUsageLedger.startedAt, end),
        operation ? eq(providerUsageLedger.operation, operation) : undefined,
      ))
      .groupBy(providerUsageLedger.provider);

    const byProvider = rows.map((row) => ({
      ...row,
      estimatedCostMicrodollars: Number(row.estimatedCostMicrodollars),
    }));
    const total = (field: keyof (typeof byProvider)[number]) =>
      byProvider.reduce((sum, row) => sum + Number(row[field]), 0);

    return {
      period,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      requestCount: total("requestCount"),
      completedCount: total("completedCount"),
      failedCount: total("failedCount"),
      inputTokens: total("inputTokens"),
      outputTokens: total("outputTokens"),
      credits: total("credits"),
      estimatedCostMicrodollars: total("estimatedCostMicrodollars"),
      byProvider,
    };
  }
}

let ledger: DrizzleProviderUsageLedger | undefined;

export function getProviderUsageLedger(): DrizzleProviderUsageLedger {
  ledger ??= new DrizzleProviderUsageLedger();
  return ledger;
}
