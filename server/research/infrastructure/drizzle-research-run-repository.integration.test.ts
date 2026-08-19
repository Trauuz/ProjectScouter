import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import * as schema from "@/server/database/schema";

import { VisitorSessionId, type ResearchOwner } from "../domain/research-owner";
import type { ResearchReport } from "../domain/research-report";

vi.mock("server-only", () => ({}));

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const sessionId = VisitorSessionId.generate();
const owner: ResearchOwner = { sessionId, userId: null };
const report: ResearchReport = {
  prompt: "Finance tracking for independent studios",
  summary: "Studios need lightweight cash-flow visibility.",
  generatedAt: "2026-08-18T00:00:00.000Z",
  sources: [
    {
      id: "src-1",
      title: "Independent studio survey",
      url: "https://example.com/studios",
      snippet: "Cash-flow visibility is a recurring concern.",
      publishedAt: "not-a-provider-date",
    },
  ],
  recommendations: [
    {
      title: "Studio Cash Map",
      targetUser: "Independent studio owners",
      problem: "Project income and expenses are difficult to forecast.",
      proposedSolution: "A project-aware cash-flow tracker.",
      mvpFeatures: ["Project ledger", "Runway forecast"],
      scopeEstimate: "small",
      similarProducts: ["Wave"],
      differentiation: "Forecasts around irregular client projects.",
      risks: ["Owners may already use spreadsheets."],
      validationExperiment: "Interview five studio owners.",
      evidenceSourceIds: ["src-1"],
      evidenceStrength: "medium",
      weakEvidence: true,
    },
  ],
};

describe.skipIf(!testDatabaseUrl)("DrizzleResearchRunRepository", () => {
  const sqlClient = postgres(testDatabaseUrl ?? "", {
    prepare: false,
    max: 1,
  });
  const database = drizzle(sqlClient, { schema });

  beforeAll(async () => {
    await migrate(database, { migrationsFolder: "drizzle" });
  });

  afterAll(async () => {
    await sqlClient`
      delete from projectscout.research_runs
      where session_id = ${sessionId.toString()}::uuid
    `;
    await sqlClient.end({ timeout: 5 });
  });

  it("saves, owns, lists, reconstructs, and attaches a complete run", async () => {
    const { DrizzleResearchRunRepository } = await import(
      "./drizzle-research-run-repository"
    );
    const repository = new DrizzleResearchRunRepository(database);

    const runId = await repository.saveCompletedResearchRun(owner, report);
    const saved = await repository.fetchResearchRunWithDetails(runId, owner);
    const wrongOwner: ResearchOwner = {
      sessionId: VisitorSessionId.generate(),
      userId: null,
    };

    expect(saved?.report.sources[0]?.publishedAt).toBeNull();
    expect(saved?.report.recommendations[0]?.evidenceSourceIds).toEqual([
      "src-1",
    ]);
    expect(
      await repository.fetchResearchRunWithDetails(runId, wrongOwner),
    ).toBeNull();
    expect(await repository.listRecentResearchRunsBySessionId(sessionId, 1))
      .toEqual([
        expect.objectContaining({ id: runId, prompt: report.prompt }),
      ]);
    expect(
      await repository.attachResearchRunsToUser(
        sessionId,
        "2dc76913-e72a-4ee2-8d53-e4872a0814cc",
      ),
    ).toBeGreaterThanOrEqual(1);
  });
});
