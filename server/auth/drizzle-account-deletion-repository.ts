import "server-only";

import { and, eq, inArray, isNotNull, lte, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { getDatabase, type ProjectScoutDatabase } from "../database/client";
import {
  accountDeletionAuditEvents,
  accountDeletionRequests,
} from "../database/schema";
import type {
  AccountDeletionJob,
  AccountDeletionRepository,
  AccountDeletionStep,
} from "./account-deletion-workflow";

const uuidSchema = z.string().uuid();
const RETRY_DELAY_MS = 5 * 60 * 1_000;

type DeletionRequestRow = typeof accountDeletionRequests.$inferSelect;
type ProjectScoutTransaction = Parameters<
  Parameters<ProjectScoutDatabase["transaction"]>[0]
>[0];

function toJob(row: DeletionRequestRow): AccountDeletionJob {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    nextStep: row.nextStep,
    attemptCount: row.attemptCount,
    lastErrorCode: row.lastErrorCode,
  };
}

async function findJob(
  transaction: ProjectScoutTransaction,
  requestId: string,
): Promise<AccountDeletionJob> {
  const [row] = await transaction
    .select()
    .from(accountDeletionRequests)
    .where(eq(accountDeletionRequests.id, requestId))
    .limit(1);
  if (!row) {
    throw new Error("Account deletion request was not found.");
  }
  return toJob(row);
}

type AuditEvent = typeof accountDeletionAuditEvents.$inferInsert["event"];

async function recordAudit(
  transaction: ProjectScoutTransaction,
  requestId: string,
  event: AuditEvent,
  step: AccountDeletionStep,
  errorCode?: string,
): Promise<void> {
  await transaction.insert(accountDeletionAuditEvents).values({
    requestId,
    event,
    step,
    errorCode,
  });
}

export class DrizzleAccountDeletionRepository implements AccountDeletionRepository {
  constructor(private readonly database: ProjectScoutDatabase = getDatabase()) {}

  recordRequest(userId: string, requestId: string): Promise<AccountDeletionJob> {
    const validUserId = uuidSchema.parse(userId);
    const validRequestId = uuidSchema.parse(requestId);
    const now = new Date();
    return this.database.transaction(async (transaction) => {
      const [row] = await transaction
        .insert(accountDeletionRequests)
        .values({
          id: validRequestId,
          userId: validUserId,
          lastAttemptAt: now,
          nextAttemptAt: now,
        })
        .onConflictDoUpdate({
          target: accountDeletionRequests.userId,
          set: {
            attemptCount: sql`${accountDeletionRequests.attemptCount} + 1`,
            lastAttemptAt: now,
            nextAttemptAt: now,
            updatedAt: now,
          },
        })
        .returning();
      if (!row) {
        throw new Error("Account deletion request insert returned no record.");
      }
      await recordAudit(
        transaction,
        row.id,
        "request_recorded",
        row.nextStep,
      );
      return toJob(row);
    });
  }

  markAccessRevoked(requestId: string): Promise<AccountDeletionJob> {
    return this.advance(
      requestId,
      "revoke_access",
      "delete_authentication",
      "access_revoked",
    );
  }

  markAuthenticationDeleted(requestId: string): Promise<AccountDeletionJob> {
    return this.advance(
      requestId,
      "delete_authentication",
      "delete_application_data",
      "authentication_deleted",
    );
  }

  markApplicationDataDeleted(requestId: string): Promise<AccountDeletionJob> {
    return this.advance(
      requestId,
      "delete_application_data",
      "complete",
      "application_data_deleted",
    );
  }

  markCompleted(requestId: string): Promise<AccountDeletionJob> {
    const validRequestId = uuidSchema.parse(requestId);
    return this.database.transaction(async (transaction) => {
      const [row] = await transaction
        .update(accountDeletionRequests)
        .set({
          userId: null,
          status: "completed",
          lastErrorCode: null,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(accountDeletionRequests.id, validRequestId),
          eq(accountDeletionRequests.nextStep, "complete"),
          ne(accountDeletionRequests.status, "completed"),
        ))
        .returning();
      if (!row) {
        return findJob(transaction, validRequestId);
      }
      await recordAudit(transaction, row.id, "completed", "complete");
      return toJob(row);
    });
  }

  markRetryableFailure(
    requestId: string,
    failedStep: AccountDeletionStep,
    errorCode: string,
  ): Promise<AccountDeletionJob> {
    const validRequestId = uuidSchema.parse(requestId);
    const now = new Date();
    return this.database.transaction(async (transaction) => {
      const [row] = await transaction
        .update(accountDeletionRequests)
        .set({
          status: "retryable_failed",
          lastErrorCode: errorCode.slice(0, 100),
          attemptCount: sql`${accountDeletionRequests.attemptCount} + 1`,
          lastAttemptAt: now,
          nextAttemptAt: new Date(now.getTime() + RETRY_DELAY_MS),
          updatedAt: now,
        })
        .where(and(
          eq(accountDeletionRequests.id, validRequestId),
          eq(accountDeletionRequests.nextStep, failedStep),
          ne(accountDeletionRequests.status, "completed"),
        ))
        .returning();
      if (!row) {
        return findJob(transaction, validRequestId);
      }
      await recordAudit(
        transaction,
        row.id,
        "retryable_failure",
        failedStep,
        row.lastErrorCode ?? undefined,
      );
      return toJob(row);
    });
  }

  async listRetryable(limit: number): Promise<AccountDeletionJob[]> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    const rows = await this.database
      .select()
      .from(accountDeletionRequests)
      .where(and(
        inArray(accountDeletionRequests.status, ["pending", "retryable_failed"]),
        lte(accountDeletionRequests.nextAttemptAt, new Date()),
        isNotNull(accountDeletionRequests.userId),
      ))
      .limit(safeLimit);
    return rows.map(toJob);
  }

  async isAccessRevoked(userId: string): Promise<boolean> {
    const [row] = await this.database
      .select({ id: accountDeletionRequests.id })
      .from(accountDeletionRequests)
      .where(and(
        eq(accountDeletionRequests.userId, uuidSchema.parse(userId)),
        ne(accountDeletionRequests.status, "completed"),
      ))
      .limit(1);
    return Boolean(row);
  }

  private advance(
    requestId: string,
    expectedStep: AccountDeletionStep,
    nextStep: AccountDeletionStep,
    event: AuditEvent,
  ): Promise<AccountDeletionJob> {
    const validRequestId = uuidSchema.parse(requestId);
    return this.database.transaction(async (transaction) => {
      const [row] = await transaction
        .update(accountDeletionRequests)
        .set({
          status: "pending",
          nextStep,
          lastErrorCode: null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(accountDeletionRequests.id, validRequestId),
          eq(accountDeletionRequests.nextStep, expectedStep),
          ne(accountDeletionRequests.status, "completed"),
        ))
        .returning();
      if (!row) {
        return findJob(transaction, validRequestId);
      }
      await recordAudit(transaction, row.id, event, expectedStep);
      return toJob(row);
    });
  }
}

let repository: DrizzleAccountDeletionRepository | undefined;

export function getAccountDeletionRepository(): DrizzleAccountDeletionRepository {
  repository ??= new DrizzleAccountDeletionRepository();
  return repository;
}
