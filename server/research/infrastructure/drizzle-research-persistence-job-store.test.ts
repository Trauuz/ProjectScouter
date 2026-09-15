import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  researchPersistenceJobs,
  usageReservations,
} from "../../database/schema";
import { VisitorSessionId } from "../domain/research-owner";
import { DrizzleResearchPersistenceJobStore } from "./drizzle-research-persistence-job-store";

const JOB_ID = "2a1a66b1-f065-4334-889e-935b40958580";
const RESERVATION_ID = "7206b527-d9b0-42e7-87f2-bd78dd354db6";
const USER_ID = "05eb1d2c-a1ec-43f0-8967-24299194382a";
const owner = {
  sessionId: VisitorSessionId.create("8b6d910d-84d2-46c8-bc3c-0d6e259202b0"),
  userId: USER_ID,
};
const report = {
  prompt: "Find a useful project idea",
  summary: "Summary",
  generatedAt: "2026-09-15T00:00:00.000Z",
  sources: [],
  recommendations: [],
};

class PersistenceJobDatabase {
  readonly updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];

  select() {
    return {
      from: () => ({
        where: () => ({
          limit: async () => [{
            id: JOB_ID,
            sessionId: owner.sessionId.toString(),
            userId: USER_ID,
            usageReservationId: RESERVATION_ID,
            report,
            status: "pending",
          }],
        }),
      }),
    };
  }

  transaction<T>(work: (transaction: this) => Promise<T>): Promise<T> {
    return work(this);
  }

  update(table: unknown) {
    return {
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          this.updates.push({ table, values });
        },
      }),
    };
  }
}

describe("DrizzleResearchPersistenceJobStore", () => {
  it("completes the linked usage reservation only after the run is saved", async () => {
    const database = new PersistenceJobDatabase();
    const writer = {
      saveCompletedResearchRun: vi.fn().mockResolvedValue(JOB_ID),
    };
    const store = new DrizzleResearchPersistenceJobStore(
      database as never,
      writer,
      vi.fn(),
    );

    await expect(store.materialize(JOB_ID, owner)).resolves.toEqual({
      report,
      runId: JOB_ID,
    });

    expect(writer.saveCompletedResearchRun).toHaveBeenCalledWith(
      owner,
      report,
      JOB_ID,
    );
    expect(database.updates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: researchPersistenceJobs,
        values: expect.objectContaining({ status: "completed" }),
      }),
      expect.objectContaining({
        table: usageReservations,
        values: expect.objectContaining({ status: "completed" }),
      }),
    ]));
  });

  it("records a retryable state and sanitized metric when materialization fails", async () => {
    const database = new PersistenceJobDatabase();
    const events: unknown[] = [];
    const store = new DrizzleResearchPersistenceJobStore(
      database as never,
      { saveCompletedResearchRun: vi.fn().mockRejectedValue(
        new Error("postgres connection string"),
      ) },
      (event) => events.push(event),
    );

    await expect(store.materialize(JOB_ID, owner)).rejects.toThrow();

    expect(database.updates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: researchPersistenceJobs,
        values: expect.objectContaining({
          status: "retryable_failed",
          lastErrorCode: "Error",
        }),
      }),
    ]));
    expect(events).toEqual([
      expect.objectContaining({
        event: "research.persistence.retryable_failure",
        retryId: JOB_ID,
        errorType: "Error",
      }),
    ]);
    expect(JSON.stringify(events)).not.toContain("postgres connection string");
  });
});
