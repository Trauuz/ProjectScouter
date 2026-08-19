import "server-only";

import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";

import {
  getDatabase,
  type ProjectScoutDatabase,
} from "@/server/database/client";
import {
  projectRecommendations,
  recommendationSources,
  researchRuns,
  researchSources,
  type ProjectRecommendationRow,
  type ResearchRunRow,
  type ResearchSourceRow,
} from "@/server/database/schema";

import type { ResearchReportWriter } from "../application/research-ports";
import type { ResearchOwner } from "../domain/research-owner";
import type {
  ProjectRecommendation,
  ResearchReport,
  ResearchSource,
} from "../domain/research-report";

type ProjectScoutTransaction = Parameters<
  Parameters<ProjectScoutDatabase["transaction"]>[0]
>[0];
type DatabaseExecutor = ProjectScoutDatabase | ProjectScoutTransaction;

export type SavedResearchRun = {
  id: string;
  sessionId: string;
  userId: string | null;
  createdAt: string;
  report: ResearchReport;
};

export type RecentResearchRun = {
  id: string;
  prompt: string;
  summary: string;
  generatedAt: string;
  createdAt: string;
};

const uuidSchema = z.string().uuid();

function nullableDate(candidate: string | null): Date | null {
  if (!candidate) {
    return null;
  }

  const date = new Date(candidate);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function requiredDate(candidate: string): Date {
  const date = new Date(candidate);
  if (Number.isNaN(date.valueOf())) {
    throw new Error(`Invalid generated date: ${candidate}`);
  }

  return date;
}

function sourceValues(runId: string, sources: ResearchSource[]) {
  return sources.map((source, position) => ({
    researchRunId: runId,
    sourceKey: source.id,
    position,
    title: source.title,
    url: source.url,
    snippet: source.snippet,
    publishedAt: nullableDate(source.publishedAt),
  }));
}

function recommendationValues(
  runId: string,
  recommendations: ProjectRecommendation[],
) {
  return recommendations.map((recommendation, position) => ({
    researchRunId: runId,
    position,
    title: recommendation.title,
    targetUser: recommendation.targetUser,
    problem: recommendation.problem,
    proposedSolution: recommendation.proposedSolution,
    mvpFeatures: recommendation.mvpFeatures,
    scopeEstimate: recommendation.scopeEstimate,
    similarProducts: recommendation.similarProducts,
    differentiation: recommendation.differentiation,
    risks: recommendation.risks,
    validationExperiment: recommendation.validationExperiment,
    evidenceStrength: recommendation.evidenceStrength,
    weakEvidence: recommendation.weakEvidence,
  }));
}

async function insertResearchRun(
  executor: DatabaseExecutor,
  owner: ResearchOwner,
  report: ResearchReport,
): Promise<ResearchRunRow> {
  const [run] = await executor
    .insert(researchRuns)
    .values({
      sessionId: owner.sessionId.toString(),
      userId: owner.userId,
      prompt: report.prompt,
      summary: report.summary,
      generatedAt: requiredDate(report.generatedAt),
    })
    .returning();

  if (!run) {
    throw new Error("The research run insert returned no record.");
  }

  return run;
}

async function insertResearchSources(
  executor: DatabaseExecutor,
  runId: string,
  sources: ResearchSource[],
): Promise<Map<string, ResearchSourceRow>> {
  if (sources.length === 0) {
    return new Map();
  }

  const savedSources = await executor
    .insert(researchSources)
    .values(sourceValues(runId, sources))
    .returning();

  return new Map(savedSources.map((source) => [source.sourceKey, source]));
}

async function insertProjectRecommendations(
  executor: DatabaseExecutor,
  runId: string,
  recommendations: ProjectRecommendation[],
  sourcesByKey: Map<string, ResearchSourceRow>,
): Promise<ProjectRecommendationRow[]> {
  if (recommendations.length === 0) {
    return [];
  }

  const savedRecommendations = await executor
    .insert(projectRecommendations)
    .values(recommendationValues(runId, recommendations))
    .returning();
  const joins = savedRecommendations.flatMap((savedRecommendation) => {
    const recommendation = recommendations[savedRecommendation.position];
    if (!recommendation) {
      throw new Error("A saved recommendation has no matching report entry.");
    }

    return recommendation.evidenceSourceIds.map((sourceKey) => {
      const source = sourcesByKey.get(sourceKey);
      if (!source) {
        throw new Error(`Recommendation references unknown source ${sourceKey}.`);
      }

      return {
        recommendationId: savedRecommendation.id,
        sourceId: source.id,
      };
    });
  });

  if (joins.length > 0) {
    await executor.insert(recommendationSources).values(joins);
  }

  return savedRecommendations;
}

function ownershipCondition(owner: ResearchOwner) {
  const sessionCondition = eq(
    researchRuns.sessionId,
    owner.sessionId.toString(),
  );

  return owner.userId
    ? or(sessionCondition, eq(researchRuns.userId, owner.userId))
    : sessionCondition;
}

export class DrizzleResearchRunRepository implements ResearchReportWriter {
  constructor(private readonly database: ProjectScoutDatabase = getDatabase()) {}

  createResearchRun(
    owner: ResearchOwner,
    report: ResearchReport,
  ): Promise<ResearchRunRow> {
    return insertResearchRun(this.database, owner, report);
  }

  saveResearchSources(
    runId: string,
    sources: ResearchSource[],
  ): Promise<Map<string, ResearchSourceRow>> {
    return insertResearchSources(this.database, uuidSchema.parse(runId), sources);
  }

  saveProjectRecommendations(
    runId: string,
    recommendations: ProjectRecommendation[],
    sourcesByKey: Map<string, ResearchSourceRow>,
  ): Promise<ProjectRecommendationRow[]> {
    return insertProjectRecommendations(
      this.database,
      uuidSchema.parse(runId),
      recommendations,
      sourcesByKey,
    );
  }

  async saveCompletedResearchRun(
    owner: ResearchOwner,
    report: ResearchReport,
  ): Promise<string> {
    return this.database.transaction(async (transaction) => {
      const run = await insertResearchRun(transaction, owner, report);
      const sourcesByKey = await insertResearchSources(
        transaction,
        run.id,
        report.sources,
      );
      await insertProjectRecommendations(
        transaction,
        run.id,
        report.recommendations,
        sourcesByKey,
      );
      return run.id;
    });
  }

  async fetchResearchRunWithDetails(
    runId: string,
    owner: ResearchOwner,
  ): Promise<SavedResearchRun | null> {
    const [run] = await this.database
      .select()
      .from(researchRuns)
      .where(
        and(
          eq(researchRuns.id, uuidSchema.parse(runId)),
          ownershipCondition(owner),
        ),
      )
      .limit(1);

    if (!run) {
      return null;
    }

    const [sources, recommendations] = await Promise.all([
      this.database
        .select()
        .from(researchSources)
        .where(eq(researchSources.researchRunId, run.id))
        .orderBy(asc(researchSources.position)),
      this.database
        .select()
        .from(projectRecommendations)
        .where(eq(projectRecommendations.researchRunId, run.id))
        .orderBy(asc(projectRecommendations.position)),
    ]);
    const sourceKeysByRecommendation = await this.sourceKeysByRecommendation(
      recommendations.map((recommendation) => recommendation.id),
    );

    return {
      id: run.id,
      sessionId: run.sessionId,
      userId: run.userId,
      createdAt: run.createdAt.toISOString(),
      report: {
        prompt: run.prompt,
        summary: run.summary,
        generatedAt: run.generatedAt.toISOString(),
        sources: sources.map((source) => ({
          id: source.sourceKey,
          title: source.title,
          url: source.url,
          snippet: source.snippet,
          publishedAt: source.publishedAt?.toISOString() ?? null,
        })),
        recommendations: recommendations.map((recommendation) => ({
          title: recommendation.title,
          targetUser: recommendation.targetUser,
          problem: recommendation.problem,
          proposedSolution: recommendation.proposedSolution,
          mvpFeatures: recommendation.mvpFeatures,
          scopeEstimate: recommendation.scopeEstimate,
          similarProducts: recommendation.similarProducts,
          differentiation: recommendation.differentiation,
          risks: recommendation.risks,
          validationExperiment: recommendation.validationExperiment,
          evidenceSourceIds:
            sourceKeysByRecommendation.get(recommendation.id) ?? [],
          evidenceStrength: recommendation.evidenceStrength,
          weakEvidence: recommendation.weakEvidence,
        })),
      },
    };
  }

  async listRecentResearchRunsBySessionId(
    sessionId: ResearchOwner["sessionId"],
    limit = 20,
  ): Promise<RecentResearchRun[]> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
    const runs = await this.database
      .select({
        id: researchRuns.id,
        prompt: researchRuns.prompt,
        summary: researchRuns.summary,
        generatedAt: researchRuns.generatedAt,
        createdAt: researchRuns.createdAt,
      })
      .from(researchRuns)
      .where(eq(researchRuns.sessionId, sessionId.toString()))
      .orderBy(desc(researchRuns.createdAt))
      .limit(safeLimit);

    return runs.map((run) => ({
      id: run.id,
      prompt: run.prompt,
      summary: run.summary,
      generatedAt: run.generatedAt.toISOString(),
      createdAt: run.createdAt.toISOString(),
    }));
  }

  async attachResearchRunsToUser(
    sessionId: ResearchOwner["sessionId"],
    userId: string,
  ): Promise<number> {
    const attached = await this.database
      .update(researchRuns)
      .set({ userId: uuidSchema.parse(userId) })
      .where(eq(researchRuns.sessionId, sessionId.toString()))
      .returning({ id: researchRuns.id });

    return attached.length;
  }

  private async sourceKeysByRecommendation(
    recommendationIds: string[],
  ): Promise<Map<string, string[]>> {
    if (recommendationIds.length === 0) {
      return new Map();
    }

    const links = await this.database
      .select({
        recommendationId: recommendationSources.recommendationId,
        sourceKey: researchSources.sourceKey,
        sourcePosition: researchSources.position,
      })
      .from(recommendationSources)
      .innerJoin(
        researchSources,
        eq(recommendationSources.sourceId, researchSources.id),
      )
      .where(
        inArray(recommendationSources.recommendationId, recommendationIds),
      )
      .orderBy(asc(researchSources.position));
    const result = new Map<string, string[]>();

    for (const link of links) {
      const keys = result.get(link.recommendationId) ?? [];
      keys.push(link.sourceKey);
      result.set(link.recommendationId, keys);
    }

    return result;
  }
}

let repository: DrizzleResearchRunRepository | undefined;

export function getResearchRunRepository(): DrizzleResearchRunRepository {
  repository ??= new DrizzleResearchRunRepository();
  return repository;
}
