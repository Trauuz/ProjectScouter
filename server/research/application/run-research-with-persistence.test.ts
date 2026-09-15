import { describe, expect, it, vi } from "vitest";

import { ResearchPrompt } from "../domain/research-prompt";
import { VisitorSessionId } from "../domain/research-owner";
import type { ResearchReport } from "../domain/research-report";
import { RunResearchWithPersistence } from "./run-research-with-persistence";

const JOB_ID = "2a1a66b1-f065-4334-889e-935b40958580";
const RUN_ID = JOB_ID;
const USER_ID = "05eb1d2c-a1ec-43f0-8967-24299194382a";
const report: ResearchReport = {
  prompt: "Find a useful project idea",
  summary: "Generated summary",
  generatedAt: "2026-09-15T00:00:00.000Z",
  sources: [],
  recommendations: [],
};
const owner = {
  sessionId: VisitorSessionId.create("8b6d910d-84d2-46c8-bc3c-0d6e259202b0"),
  userId: USER_ID,
};

describe("RunResearchWithPersistence", () => {
  it("returns explicit partial success when materialization fails after providers succeed", async () => {
    const runResearch = { execute: vi.fn().mockResolvedValue(report) };
    const persistenceJobs = {
      stageGenerated: vi.fn().mockResolvedValue({ id: JOB_ID, report }),
      materialize: vi.fn().mockRejectedValue(new Error("database unavailable")),
    };
    const reportFailure = vi.fn();
    const workflow = new RunResearchWithPersistence(
      runResearch,
      persistenceJobs,
      reportFailure,
    );

    const result = await workflow.execute(
      ResearchPrompt.create(report.prompt),
      owner,
      new AbortController().signal,
      { usageReservationId: "7206b527-d9b0-42e7-87f2-bd78dd354db6" },
    );

    expect(runResearch.execute).toHaveBeenCalledTimes(1);
    expect(persistenceJobs.stageGenerated).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      report,
      persistence: {
        status: "pending",
        retryId: JOB_ID,
        message: "Research is complete but still being saved. Retry saving without running the research again.",
      },
    });
    expect(reportFailure).toHaveBeenCalledWith({
      event: "research.persistence.failed",
      phase: "materialize",
      retryId: JOB_ID,
      errorType: "Error",
    });
  });

  it("retries a staged report without rerunning either provider", async () => {
    const runResearch = { execute: vi.fn().mockResolvedValue(report) };
    const persistenceJobs = {
      stageGenerated: vi.fn().mockResolvedValue({ id: JOB_ID, report }),
      materialize: vi.fn()
        .mockRejectedValueOnce(new Error("transient database failure"))
        .mockResolvedValue({ report, runId: RUN_ID }),
    };
    const workflow = new RunResearchWithPersistence(
      runResearch,
      persistenceJobs,
      vi.fn(),
    );

    await workflow.execute(
      ResearchPrompt.create(report.prompt),
      owner,
      new AbortController().signal,
      { usageReservationId: "7206b527-d9b0-42e7-87f2-bd78dd354db6" },
    );
    const retried = await workflow.retry(JOB_ID, owner);

    expect(retried).toEqual({
      report,
      persistence: { status: "saved", runId: RUN_ID },
    });
    expect(runResearch.execute).toHaveBeenCalledTimes(1);
    expect(persistenceJobs.stageGenerated).toHaveBeenCalledTimes(1);
    expect(persistenceJobs.materialize).toHaveBeenCalledTimes(2);
  });

  it("does not describe an unstaged report as durable", async () => {
    const runResearch = { execute: vi.fn().mockResolvedValue(report) };
    const persistenceJobs = {
      stageGenerated: vi.fn().mockRejectedValue(new Error("database unavailable")),
      materialize: vi.fn(),
    };
    const workflow = new RunResearchWithPersistence(
      runResearch,
      persistenceJobs,
      vi.fn(),
    );

    await expect(workflow.execute(
      ResearchPrompt.create(report.prompt),
      owner,
      new AbortController().signal,
      { usageReservationId: "7206b527-d9b0-42e7-87f2-bd78dd354db6" },
    )).rejects.toMatchObject({ code: "PERSISTENCE_UNAVAILABLE" });
  });
});
