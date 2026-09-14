import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  accountMonthlyUsage,
  usageReservations,
} from "../database/schema";

import { DrizzleMonthlyUsageMeter } from "./drizzle-monthly-usage-meter";

const TAVILY_COUNTER_ID = "00000000-0000-4000-8000-000000000001";
const GOOGLE_COUNTER_ID = "00000000-0000-4000-8000-000000000002";
const USER_ID = "138bb24c-202a-448e-93ae-9bdfbabeec71";

type CounterValues = {
  userId: string;
  periodStart: string;
  usedCredits: number;
};

class AtomicReservationDatabase {
  private transactionQueue: Promise<unknown> = Promise.resolve();
  private readonly counters = new Map<string, number>();
  reservationCount = 0;

  transaction<T>(work: (transaction: this) => Promise<T>): Promise<T> {
    const result = this.transactionQueue.then(() => work(this));
    this.transactionQueue = result.catch(() => undefined);
    return result;
  }

  insert(table: unknown) {
    return {
      values: (values: CounterValues) => {
        if (table === usageReservations) {
          this.reservationCount += 1;
          return Promise.resolve();
        }

        if (table !== accountMonthlyUsage) {
          throw new Error("Unexpected table insert.");
        }

        return {
          onConflictDoUpdate: () => ({
            returning: () => this.incrementCounter(values),
          }),
        };
      },
    };
  }

  select() {
    return {
      from: () => ({
        where: () => ({
          limit: async () => [{
            usedCredits: this.usedBy(USER_ID, "2026-09-01"),
          }],
        }),
      }),
    };
  }

  usedBy(userId: string, periodStart: string): number {
    return this.counters.get(`${userId}:${periodStart}`) ?? 0;
  }

  private async incrementCounter(values: CounterValues) {
    const key = `${values.userId}:${values.periodStart}`;
    const current = this.counters.get(key) ?? 0;
    const limit = values.userId === TAVILY_COUNTER_ID
      ? 900
      : values.userId === GOOGLE_COUNTER_ID
        ? 10
        : 5;

    if (current + values.usedCredits > limit) {
      return [];
    }

    const usedCredits = current + values.usedCredits;
    this.counters.set(key, usedCredits);
    return [{ usedCredits }];
  }
}

describe("DrizzleMonthlyUsageMeter concurrency", () => {
  it("atomically limits concurrent reservations across account and application counters", async () => {
    const database = new AtomicReservationDatabase();
    const meter = new DrizzleMonthlyUsageMeter(database as never);
    const now = new Date("2026-09-14T12:00:00.000Z");

    const results = await Promise.all(
      Array.from({ length: 6 }, () => meter.reserve(USER_ID, now)),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(5);
    expect(results.filter((result) => !result.allowed)).toEqual([
      expect.objectContaining({ denialReason: "account" }),
    ]);
    expect(database.reservationCount).toBe(5);
    expect(database.usedBy(USER_ID, "2026-09-01")).toBe(5);
    expect(database.usedBy(TAVILY_COUNTER_ID, "2026-09-01")).toBe(10);
    expect(database.usedBy(GOOGLE_COUNTER_ID, "2026-09-14")).toBe(5);
  });
});
