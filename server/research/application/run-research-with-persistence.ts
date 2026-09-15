import { ResearchFailure } from "./research-errors";
import type {
  ResearchExecutionContext,
  ResearchPersistenceJobStore,
  ResearchUseCase,
  ResearchWorkflow,
} from "./research-ports";
import type { ResearchOwner } from "../domain/research-owner";
import type { ResearchPrompt } from "../domain/research-prompt";
import { logger } from "@/server/observability/structured-logger";

const PENDING_MESSAGE =
  "Research is complete but still being saved. Retry saving without running the research again.";

export type ResearchPersistenceFailureEvent = Readonly<{
  event: "research.persistence.failed";
  phase: "stage" | "materialize";
  retryId?: string;
  errorType: string;
}>;

type FailureReporter = (event: ResearchPersistenceFailureEvent) => void;

function errorType(reason: unknown): string {
  return reason instanceof Error ? reason.name : "UnknownError";
}

export class RunResearchWithPersistence implements ResearchWorkflow {
  constructor(
    private readonly runResearch: ResearchUseCase,
    private readonly persistenceJobs: ResearchPersistenceJobStore,
    private readonly reportPersistenceFailure: FailureReporter = (event) => {
      logger.error(event.event, {
        operation: "persist_research",
        errorCategory: "persistence_failure",
        retryStatus: event.retryId ? "retryable" : "not_staged",
        persistenceStatus: event.retryId ? "pending" : "not_staged",
        retryId: event.retryId,
        phase: event.phase,
        errorType: event.errorType,
      });
      logger.metric("persistence.failure.count", {
        value: 1,
        phase: event.phase,
      });
    },
  ) {}

  async execute(
    prompt: ResearchPrompt,
    owner: ResearchOwner,
    signal: AbortSignal,
    context: ResearchExecutionContext = {},
  ) {
    const report = await this.runResearch.execute(prompt, signal);
    let staged;

    try {
      staged = await this.persistenceJobs.stageGenerated(
        owner,
        report,
        context.usageReservationId,
      );
    } catch (reason) {
      this.reportPersistenceFailure({
        event: "research.persistence.failed",
        phase: "stage",
        errorType: errorType(reason),
      });
      throw new ResearchFailure(
        "PERSISTENCE_UNAVAILABLE",
        "Generated research could not be staged durably.",
        reason,
      );
    }

    return this.materialize(staged.id, owner, staged.report);
  }

  async retry(retryId: string, owner: ResearchOwner) {
    return this.materialize(retryId, owner);
  }

  private async materialize(
    retryId: string,
    owner: ResearchOwner,
    knownReport?: Awaited<ReturnType<ResearchUseCase["execute"]>>,
  ) {
    try {
      const saved = await this.persistenceJobs.materialize(retryId, owner);
      return {
        report: saved.report,
        persistence: { status: "saved" as const, runId: saved.runId },
      };
    } catch (reason) {
      this.reportPersistenceFailure({
        event: "research.persistence.failed",
        phase: "materialize",
        retryId,
        errorType: errorType(reason),
      });
      if (!knownReport) {
        throw new ResearchFailure(
          "PERSISTENCE_UNAVAILABLE",
          "Staged research could not be loaded for retry.",
          reason,
        );
      }
      return {
        report: knownReport,
        persistence: {
          status: "pending" as const,
          retryId,
          message: PENDING_MESSAGE,
        },
      };
    }
  }
}
