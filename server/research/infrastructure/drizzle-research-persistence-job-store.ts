import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { getDatabase, type ProjectScoutDatabase } from "../../database/client";
import {
  researchPersistenceJobs,
  usageReservations,
} from "../../database/schema";
import type {
  ResearchPersistenceJobStore,
  ResearchReportWriter,
} from "../application/research-ports";
import type { ResearchOwner } from "../domain/research-owner";
import type { ResearchReport } from "../domain/research-report";
import { DrizzleResearchRunRepository } from "./drizzle-research-run-repository";
import { logger } from "@/server/observability/structured-logger";

const uuidSchema = z.string().uuid();

type PersistenceJobEvent = Readonly<{
  event:
    | "research.persistence.staged"
    | "research.persistence.materialized"
    | "research.persistence.retryable_failure";
  retryId: string;
  durationMs: number;
  errorType?: string;
}>;

type PersistenceJobReporter = (event: PersistenceJobEvent) => void;

function defaultReporter(event: PersistenceJobEvent): void {
  if (event.event === "research.persistence.retryable_failure") {
    logger.error(event.event, {
      operation: "materialize_research",
      retryId: event.retryId,
      durationMs: event.durationMs,
      errorCategory: "persistence_failure",
      retryStatus: "retryable",
      persistenceStatus: "pending",
      errorType: event.errorType,
    });
    logger.metric("persistence.failure.count", { value: 1 });
    return;
  }
  logger.info(event.event, {
    operation: "persist_research",
    retryId: event.retryId,
    durationMs: event.durationMs,
    retryStatus: "not_required",
    persistenceStatus: event.event === "research.persistence.materialized"
      ? "saved"
      : "staged",
  });
}

function ownerCondition(owner: ResearchOwner) {
  if (owner.userId) {
    return eq(researchPersistenceJobs.userId, uuidSchema.parse(owner.userId));
  }
  return and(
    eq(
      researchPersistenceJobs.sessionId,
      uuidSchema.parse(owner.sessionId.toString()),
    ),
    isNull(researchPersistenceJobs.userId),
  );
}

function failureCode(reason: unknown): string {
  return reason instanceof Error ? reason.name.slice(0, 100) : "UnknownError";
}

export class DrizzleResearchPersistenceJobStore
  implements ResearchPersistenceJobStore {
  constructor(
    private readonly database: ProjectScoutDatabase = getDatabase(),
    private readonly writer: ResearchReportWriter =
      new DrizzleResearchRunRepository(database),
    private readonly report: PersistenceJobReporter = defaultReporter,
  ) {}

  async stageGenerated(
    owner: ResearchOwner,
    generatedReport: ResearchReport,
    usageReservationId?: string,
  ) {
    const startedAt = Date.now();
    const id = crypto.randomUUID();
    const validUsageReservationId = usageReservationId
      ? uuidSchema.parse(usageReservationId)
      : undefined;
    const [inserted] = await this.database
      .insert(researchPersistenceJobs)
      .values({
        id,
        sessionId: uuidSchema.parse(owner.sessionId.toString()),
        userId: owner.userId ? uuidSchema.parse(owner.userId) : null,
        usageReservationId: validUsageReservationId,
        report: generatedReport,
      })
      .onConflictDoNothing({
        target: researchPersistenceJobs.usageReservationId,
      })
      .returning({ id: researchPersistenceJobs.id });

    const staged = inserted
      ? { id: inserted.id, report: generatedReport }
      : await this.existingStagedResearch(owner, validUsageReservationId);
    this.report({
      event: "research.persistence.staged",
      retryId: staged.id,
      durationMs: Date.now() - startedAt,
    });
    return staged;
  }

  async materialize(retryId: string, owner: ResearchOwner) {
    const validRetryId = uuidSchema.parse(retryId);
    const startedAt = Date.now();
    const job = await this.findOwnedJob(validRetryId, owner);

    try {
      const runId = await this.writer.saveCompletedResearchRun(
        owner,
        job.report,
        job.id,
      );
      await this.completeJob(job.id, job.usageReservationId, owner);
      this.report({
        event: "research.persistence.materialized",
        retryId: job.id,
        durationMs: Date.now() - startedAt,
      });
      return { report: job.report, runId };
    } catch (reason) {
      await this.recordRetryableFailure(job.id, owner, reason);
      this.report({
        event: "research.persistence.retryable_failure",
        retryId: job.id,
        durationMs: Date.now() - startedAt,
        errorType: failureCode(reason),
      });
      throw reason;
    }
  }

  private async existingStagedResearch(
    owner: ResearchOwner,
    usageReservationId: string | undefined,
  ) {
    if (!usageReservationId) {
      throw new Error("The persistence job insert returned no record.");
    }
    const [existing] = await this.database
      .select({
        id: researchPersistenceJobs.id,
        report: researchPersistenceJobs.report,
      })
      .from(researchPersistenceJobs)
      .where(and(
        eq(researchPersistenceJobs.usageReservationId, usageReservationId),
        ownerCondition(owner),
      ))
      .limit(1);
    if (!existing) {
      throw new Error("The persistence job insert returned no owned record.");
    }
    return existing;
  }

  private async findOwnedJob(retryId: string, owner: ResearchOwner) {
    const [job] = await this.database
      .select()
      .from(researchPersistenceJobs)
      .where(and(
        eq(researchPersistenceJobs.id, retryId),
        ownerCondition(owner),
      ))
      .limit(1);
    if (!job) {
      throw new Error("The persistence job was not found.");
    }
    return job;
  }

  private async completeJob(
    retryId: string,
    usageReservationId: string | null,
    owner: ResearchOwner,
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await transaction
        .update(researchPersistenceJobs)
        .set({
          status: "completed",
          attemptCount: sql`${researchPersistenceJobs.attemptCount} + 1`,
          lastErrorCode: null,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(researchPersistenceJobs.id, retryId),
          ownerCondition(owner),
        ));
      if (usageReservationId) {
        await transaction
          .update(usageReservations)
          .set({ status: "completed", updatedAt: new Date() })
          .where(and(
            eq(usageReservations.id, usageReservationId),
            eq(usageReservations.status, "pending"),
          ));
      }
    });
  }

  private async recordRetryableFailure(
    retryId: string,
    owner: ResearchOwner,
    reason: unknown,
  ): Promise<void> {
    try {
      await this.database
        .update(researchPersistenceJobs)
        .set({
          status: "retryable_failed",
          attemptCount: sql`${researchPersistenceJobs.attemptCount} + 1`,
          lastErrorCode: failureCode(reason),
          updatedAt: new Date(),
        })
        .where(and(
          eq(researchPersistenceJobs.id, retryId),
          ownerCondition(owner),
        ));
    } catch {
      // The staged row remains pending and is still safe to retry.
    }
  }
}

let persistenceJobStore: DrizzleResearchPersistenceJobStore | undefined;

export function getResearchPersistenceJobStore() {
  persistenceJobStore ??= new DrizzleResearchPersistenceJobStore();
  return persistenceJobStore;
}
