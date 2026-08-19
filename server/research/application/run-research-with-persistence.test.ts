import { describe, expect, it, vi } from "vitest";

import { ResearchPrompt } from "../domain/research-prompt";
import { VisitorSessionId, type ResearchOwner } from "../domain/research-owner";
import type { ResearchReport } from "../domain/research-report";
import type {
  ResearchReportWriter,
  ResearchUseCase,
} from "./research-ports";
import { RunResearchWithPersistence } from "./run-research-with-persistence";

const report: ResearchReport = {
  prompt: "Finance tracking for independent studios",
  summary: "Studios need lightweight cash-flow visibility.",
  generatedAt: "2026-08-18T00:00:00.000Z",
  sources: [],
  recommendations: [],
};

const owner: ResearchOwner = {
  sessionId: VisitorSessionId.create(
    "35f406bc-f482-4a23-9106-b9ae6da71b1d",
  ),
  userId: null,
};

describe("RunResearchWithPersistence", () => {
  it("returns a saved run identifier after the report is persisted", async () => {
    const runResearch: ResearchUseCase = {
      execute: vi.fn(async () => report),
    };
    const writer: ResearchReportWriter = {
      saveCompletedResearchRun: vi.fn(
        async () => "db19db89-670b-4307-900c-c1a9e80c488a",
      ),
    };
    const workflow = new RunResearchWithPersistence(runResearch, () => writer);

    const result = await workflow.execute(
      ResearchPrompt.create(report.prompt),
      owner,
      AbortSignal.timeout(1_000),
    );

    expect(result).toEqual({
      report,
      persistence: {
        status: "saved",
        runId: "db19db89-670b-4307-900c-c1a9e80c488a",
      },
    });
    expect(writer.saveCompletedResearchRun).toHaveBeenCalledWith(owner, report);
  });

  it("returns the completed report when the database is unavailable", async () => {
    const runResearch: ResearchUseCase = {
      execute: vi.fn(async () => report),
    };
    const databaseError = new Error("connection refused");
    const reportPersistenceFailure = vi.fn();
    const workflow = new RunResearchWithPersistence(
      runResearch,
      () => {
        throw databaseError;
      },
      reportPersistenceFailure,
    );

    const result = await workflow.execute(
      ResearchPrompt.create(report.prompt),
      owner,
      AbortSignal.timeout(1_000),
    );

    expect(result).toEqual({ report, persistence: { status: "failed" } });
    expect(reportPersistenceFailure).toHaveBeenCalledWith(databaseError);
  });
});
