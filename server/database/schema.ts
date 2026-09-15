import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { ResearchReport } from "../research/domain/research-report";

export const projectScoutSchema = pgSchema("projectscout");

export const scopeEstimateEnum = projectScoutSchema.enum("scope_estimate", [
  "small",
  "medium",
  "large",
]);

export const evidenceStrengthEnum = projectScoutSchema.enum(
  "evidence_strength",
  ["strong", "medium", "weak"],
);

export const usageReservationStatusEnum = projectScoutSchema.enum(
  "usage_reservation_status",
  ["pending", "completed", "released"],
);

export const researchPersistenceJobStatusEnum = projectScoutSchema.enum(
  "research_persistence_job_status",
  ["pending", "retryable_failed", "completed"],
);

export const accountDeletionStatusEnum = projectScoutSchema.enum(
  "account_deletion_status",
  ["pending", "retryable_failed", "completed"],
);

export const accountDeletionStepEnum = projectScoutSchema.enum(
  "account_deletion_step",
  [
    "revoke_access",
    "delete_authentication",
    "delete_application_data",
    "complete",
  ],
);

export const accountDeletionAuditEventEnum = projectScoutSchema.enum(
  "account_deletion_audit_event",
  [
    "request_recorded",
    "access_revoked",
    "authentication_deleted",
    "application_data_deleted",
    "retryable_failure",
    "completed",
  ],
);

export const accountDeletionRequests = projectScoutSchema.table(
  "account_deletion_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id"),
    status: accountDeletionStatusEnum("status").default("pending").notNull(),
    nextStep: accountDeletionStepEnum("next_step")
      .default("revoke_access")
      .notNull(),
    attemptCount: integer("attempt_count").default(1).notNull(),
    lastErrorCode: text("last_error_code"),
    requestedAt: timestamp("requested_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    lastAttemptAt: timestamp("last_attempt_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
    nextAttemptAt: timestamp("next_attempt_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("account_deletion_requests_user_uidx").on(table.userId),
    index("account_deletion_requests_retry_idx").on(
      table.status,
      table.nextAttemptAt,
    ),
  ],
);

export const accountDeletionAuditEvents = projectScoutSchema.table(
  "account_deletion_audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => accountDeletionRequests.id, { onDelete: "cascade" }),
    event: accountDeletionAuditEventEnum("event").notNull(),
    step: accountDeletionStepEnum("step").notNull(),
    errorCode: text("error_code"),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("account_deletion_audit_events_request_idx").on(
      table.requestId,
      table.occurredAt,
    ),
  ],
);

export const accountMonthlyUsage = projectScoutSchema.table(
  "account_monthly_usage",
  {
    userId: uuid("user_id").notNull(),
    periodStart: date("period_start", { mode: "string" }).notNull(),
    usedCredits: integer("used_credits").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.periodStart] })],
);

export const usageReservations = projectScoutSchema.table(
  "usage_reservations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    accountPeriodStart: date("account_period_start", { mode: "string" })
      .notNull(),
    status: usageReservationStatusEnum("status")
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("usage_reservations_user_period_status_idx").on(
      table.userId,
      table.accountPeriodStart,
      table.status,
    ),
  ],
);

export const researchRuns = projectScoutSchema.table(
  "research_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id").notNull(),
    userId: uuid("user_id"),
    prompt: text("prompt").notNull(),
    summary: text("summary").notNull(),
    generatedAt: timestamp("generated_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("research_runs_session_created_idx").on(
      table.sessionId,
      table.createdAt,
    ),
    index("research_runs_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const researchSources = projectScoutSchema.table(
  "research_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    researchRunId: uuid("research_run_id")
      .notNull()
      .references(() => researchRuns.id, { onDelete: "cascade" }),
    sourceKey: text("source_key").notNull(),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    snippet: text("snippet").notNull(),
    publishedAt: timestamp("published_at", {
      mode: "date",
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("research_sources_run_source_key_uidx").on(
      table.researchRunId,
      table.sourceKey,
    ),
    uniqueIndex("research_sources_run_position_uidx").on(
      table.researchRunId,
      table.position,
    ),
    index("research_sources_run_idx").on(table.researchRunId),
  ],
);

export const projectRecommendations = projectScoutSchema.table(
  "project_recommendations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    researchRunId: uuid("research_run_id")
      .notNull()
      .references(() => researchRuns.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    targetUser: text("target_user").notNull(),
    problem: text("problem").notNull(),
    proposedSolution: text("proposed_solution").notNull(),
    mvpFeatures: jsonb("mvp_features").$type<string[]>().notNull(),
    scopeEstimate: scopeEstimateEnum("scope_estimate").notNull(),
    similarProducts: jsonb("similar_products").$type<string[]>().notNull(),
    differentiation: text("differentiation").notNull(),
    risks: jsonb("risks").$type<string[]>().notNull(),
    validationExperiment: text("validation_experiment").notNull(),
    evidenceStrength: evidenceStrengthEnum("evidence_strength").notNull(),
    weakEvidence: boolean("weak_evidence").notNull(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("project_recommendations_run_position_uidx").on(
      table.researchRunId,
      table.position,
    ),
    index("project_recommendations_run_idx").on(table.researchRunId),
  ],
);

export const recommendationSources = projectScoutSchema.table(
  "recommendation_sources",
  {
    recommendationId: uuid("recommendation_id")
      .notNull()
      .references(() => projectRecommendations.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => researchSources.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.recommendationId, table.sourceId] }),
    index("recommendation_sources_source_idx").on(table.sourceId),
  ],
);

export const researchPersistenceJobs = projectScoutSchema.table(
  "research_persistence_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id").notNull(),
    userId: uuid("user_id"),
    usageReservationId: uuid("usage_reservation_id").references(
      () => usageReservations.id,
      { onDelete: "set null" },
    ),
    report: jsonb("report").$type<ResearchReport>().notNull(),
    status: researchPersistenceJobStatusEnum("status")
      .default("pending")
      .notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    lastErrorCode: text("last_error_code"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    uniqueIndex("research_persistence_jobs_usage_reservation_uidx")
      .on(table.usageReservationId),
    index("research_persistence_jobs_status_updated_idx")
      .on(table.status, table.updatedAt),
    index("research_persistence_jobs_user_idx").on(table.userId),
    index("research_persistence_jobs_session_idx").on(table.sessionId),
  ],
);

export type ResearchRunRow = typeof researchRuns.$inferSelect;
export type ResearchSourceRow = typeof researchSources.$inferSelect;
export type ProjectRecommendationRow = typeof projectRecommendations.$inferSelect;
