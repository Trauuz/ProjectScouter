import { PGlite } from "@electric-sql/pglite";
import { and, count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DrizzleAccountDeletionRepository } from "../../server/auth/drizzle-account-deletion-repository";
import type { ProjectScoutDatabase } from "../../server/database/client";
import * as schema from "../../server/database/schema";
import {
  accountDeletionAuditEvents,
  accountDeletionRequests,
  providerUsageLedger,
  projectRecommendations,
  researchRuns,
  researchSources,
  usageReservations,
} from "../../server/database/schema";
import { DrizzleProviderUsageLedger } from "../../server/provider-usage/infrastructure/drizzle-provider-usage-ledger";
import { VisitorSessionId, type ResearchOwner } from "../../server/research/domain/research-owner";
import type { ResearchReport } from "../../server/research/domain/research-report";
import { DrizzleResearchRunRepository } from "../../server/research/infrastructure/drizzle-research-run-repository";
import { DrizzleMonthlyUsageMeter } from "../../server/usage/drizzle-monthly-usage-meter";

const USER_A = "05eb1d2c-a1ec-43f0-8967-24299194382a";
const USER_B = "4ba19a1f-48bc-49eb-b9cc-9af80ac03b78";
const TEST_USAGE_LIMITS = {
  accountMonthlyResearch: 5,
  researchMonthlyCredits: 900,
  researchCreditsPerCall: 2,
  recommendationDailyCalls: 10,
};
const SHARED_SESSION = VisitorSessionId.create(
  "8b6d910d-84d2-46c8-bc3c-0d6e259202b0",
);

function owner(userId: string | null, sessionId = SHARED_SESSION): ResearchOwner {
  return { userId, sessionId };
}

function report(prompt: string): ResearchReport {
  return {
    prompt,
    summary: `Evidence summary for ${prompt}`,
    generatedAt: "2026-09-15T00:00:00.000Z",
    sources: [{
      id: "source-1",
      title: "Deterministic public source",
      url: "https://example.test/source",
      snippet: "A stable test excerpt.",
      publishedAt: "2026-09-01T00:00:00.000Z",
    }],
    recommendations: [{
      title: "Test project",
      targetUser: "Test teams",
      problem: "Regression risk",
      proposedSolution: "Automated checks",
      mvpFeatures: ["Deterministic fixture"],
      scopeEstimate: "small",
      similarProducts: [],
      differentiation: "Runs without production services",
      risks: ["Fixture drift"],
      validationExperiment: "Run the suite",
      evidenceSourceIds: ["source-1"],
      evidenceStrength: "strong",
      weakEvidence: false,
    }],
  };
}

describe("database critical paths", () => {
  let client: PGlite;
  let database: ReturnType<typeof drizzle<typeof schema>>;
  let projectDatabase: ProjectScoutDatabase;

  beforeAll(async () => {
    client = new PGlite();
    database = drizzle(client, { schema });
    projectDatabase = database as unknown as ProjectScoutDatabase;
    await migrate(database, { migrationsFolder: "drizzle" });
  });

  afterEach(async () => {
    await client.exec(`
      TRUNCATE TABLE
        projectscout.account_deletion_audit_events,
        projectscout.account_deletion_requests,
        projectscout.provider_usage_ledger,
        projectscout.research_persistence_jobs,
        projectscout.recommendation_sources,
        projectscout.project_recommendations,
        projectscout.research_sources,
        projectscout.research_runs,
        projectscout.usage_reservations,
        projectscout.account_monthly_usage
      CASCADE
    `);
  });

  afterAll(async () => {
    await client.close();
  });

  it("atomically enforces the account limit across concurrent usage reservations", async () => {
    const meter = new DrizzleMonthlyUsageMeter(
      projectDatabase,
      TEST_USAGE_LIMITS,
    );
    const reservations = await Promise.all(
      Array.from({ length: 8 }, () => meter.reserve(USER_A)),
    );
    const allowed = reservations.filter((reservation) => reservation.allowed);
    const denied = reservations.filter((reservation) => !reservation.allowed);

    expect(allowed).toHaveLength(5);
    expect(denied).toHaveLength(3);
    expect(await meter.read(USER_A)).toMatchObject({ used: 5, remaining: 0 });
  });

  it("records provider cost once and reconciles both calls to one usage reservation", async () => {
    const ledger = new DrizzleProviderUsageLedger(projectDatabase);
    const reservationId = crypto.randomUUID();
    await database.insert(usageReservations).values({
      id: reservationId,
      userId: USER_A,
      accountPeriodStart: "2026-09-01",
      status: "pending",
    });
    const research = await ledger.begin({
      internalRequestId: crypto.randomUUID(),
      idempotencyKey: `${reservationId}:research`,
      usageReservationId: reservationId,
      userId: USER_A,
      provider: "tavily",
      operation: "research",
      modelOrMode: "advanced",
      retryCount: 0,
      startedAt: new Date("2026-09-21T01:00:00.000Z"),
    });
    const duplicate = await ledger.begin({
      internalRequestId: crypto.randomUUID(),
      idempotencyKey: `${reservationId}:research`,
      usageReservationId: reservationId,
      userId: USER_A,
      provider: "tavily",
      operation: "research",
      modelOrMode: "advanced",
      retryCount: 1,
      startedAt: new Date("2026-09-21T01:00:01.000Z"),
    });

    expect(duplicate).toEqual({
      id: research.id,
      status: "pending",
      created: false,
    });
    await ledger.complete(research.id, {
      completedAt: new Date("2026-09-21T01:00:02.000Z"),
      providerRequestId: "tavily-request",
      inputTokens: 0,
      outputTokens: 0,
      credits: 2,
      estimatedCostMicrodollars: 16_000,
    });
    await ledger.complete(research.id, {
      completedAt: new Date("2026-09-21T01:00:03.000Z"),
      providerRequestId: "duplicate-request",
      inputTokens: 0,
      outputTokens: 0,
      credits: 2,
      estimatedCostMicrodollars: 99_000,
    });

    const recommendation = await ledger.begin({
      internalRequestId: crypto.randomUUID(),
      idempotencyKey: `${reservationId}:recommendation`,
      usageReservationId: reservationId,
      userId: USER_A,
      provider: "openai",
      operation: "recommendation",
      modelOrMode: "gpt-test",
      retryCount: 0,
      startedAt: new Date("2026-09-21T01:00:03.000Z"),
    });
    await ledger.complete(recommendation.id, {
      completedAt: new Date("2026-09-21T01:00:04.000Z"),
      providerRequestId: "openai-request",
      inputTokens: 100,
      outputTokens: 50,
      credits: 0,
      estimatedCostMicrodollars: 600,
    });

    const rows = await database.select().from(providerUsageLedger);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === research.id)).toMatchObject({
      providerRequestId: "tavily-request",
      estimatedCostMicrodollars: 16_000,
      retryCount: 1,
    });
    expect(await ledger.isReservationReconciled(reservationId)).toBe(true);
    await expect(ledger.summarize(
      "day",
      new Date("2026-09-21T12:00:00.000Z"),
    )).resolves.toMatchObject({
      requestCount: 2,
      completedCount: 2,
      credits: 2,
      estimatedCostMicrodollars: 16_600,
    });
  });

  it("keeps owned research isolated even when another tenant has the visitor session", async () => {
    const repository = new DrizzleResearchRunRepository(projectDatabase);
    const runId = await repository.saveCompletedResearchRun(
      owner(USER_A),
      report("tenant isolation"),
    );

    expect(await repository.fetchResearchRunWithDetails(runId, owner(USER_A)))
      .toMatchObject({ id: runId, userId: USER_A });
    expect(await repository.fetchResearchRunWithDetails(runId, owner(USER_B)))
      .toBeNull();
    expect(await repository.fetchResearchRunWithDetails(runId, owner(null)))
      .toBeNull();
  });

  it("claims anonymous runs once without stealing an already-owned row", async () => {
    const repository = new DrizzleResearchRunRepository(projectDatabase);
    await repository.saveCompletedResearchRun(owner(null), report("anonymous one"));
    await repository.saveCompletedResearchRun(owner(null), report("anonymous two"));
    const ownedRunId = await repository.saveCompletedResearchRun(
      owner(USER_A),
      report("already owned"),
    );

    const attached = await Promise.all([
      repository.attachResearchRunsToUser(SHARED_SESSION, USER_A),
      repository.attachResearchRunsToUser(SHARED_SESSION, USER_B),
    ]);
    const rows = await database
      .select({ id: researchRuns.id, userId: researchRuns.userId })
      .from(researchRuns);

    expect(attached[0] + attached[1]).toBe(2);
    expect(rows.filter((row) => row.userId === null)).toHaveLength(0);
    expect(rows.find((row) => row.id === ownedRunId)?.userId).toBe(USER_A);
  });

  it("persists a complete research graph idempotently", async () => {
    const repository = new DrizzleResearchRunRepository(projectDatabase);
    const runId = "2a1a66b1-f065-4334-889e-935b40958580";

    await repository.saveCompletedResearchRun(
      owner(USER_A),
      report("durable persistence"),
      runId,
    );
    await repository.saveCompletedResearchRun(
      owner(USER_A),
      report("durable persistence"),
      runId,
    );

    const [runCount] = await database.select({ value: count() }).from(researchRuns);
    const [sourceCount] = await database.select({ value: count() }).from(researchSources);
    const [recommendationCount] = await database
      .select({ value: count() })
      .from(projectRecommendations);
    expect(runCount?.value).toBe(1);
    expect(sourceCount?.value).toBe(1);
    expect(recommendationCount?.value).toBe(1);
  });

  it("records and advances account deletion idempotently with an audit trail", async () => {
    const repository = new DrizzleAccountDeletionRepository(projectDatabase);
    const requestedId = "53af9f2c-e3cb-4fbe-8fe5-28de78ef04ca";
    const duplicateId = "ef278f53-0eab-42c4-a50c-7761d9006b2d";
    const first = await repository.recordRequest(USER_A, requestedId);
    const repeated = await repository.recordRequest(USER_A, duplicateId);

    expect(repeated.id).toBe(first.id);
    await repository.markAccessRevoked(first.id);
    await repository.markAuthenticationDeleted(first.id);
    await repository.markApplicationDataDeleted(first.id);
    await repository.markCompleted(first.id);
    const completed = await repository.markCompleted(first.id);

    const [stored] = await database
      .select()
      .from(accountDeletionRequests)
      .where(eq(accountDeletionRequests.id, first.id));
    const [audits] = await database
      .select({ value: count() })
      .from(accountDeletionAuditEvents)
      .where(and(
        eq(accountDeletionAuditEvents.requestId, first.id),
      ));
    expect(completed).toMatchObject({ status: "completed", userId: null });
    expect(stored).toMatchObject({ status: "completed", userId: null });
    expect(audits?.value).toBe(6);
  });
});
