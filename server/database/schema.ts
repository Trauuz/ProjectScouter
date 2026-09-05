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

export type ResearchRunRow = typeof researchRuns.$inferSelect;
export type ResearchSourceRow = typeof researchSources.$inferSelect;
export type ProjectRecommendationRow = typeof projectRecommendations.$inferSelect;
