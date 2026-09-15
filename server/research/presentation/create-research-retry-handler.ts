import { ResearchFailure } from "../application/research-errors";
import type { ResearchWorkflow } from "../application/research-ports";
import type { ResearchOwner } from "../domain/research-owner";
import type { ResearchErrorResponse } from "../domain/research-report";
import { logger } from "../../observability/structured-logger";

type RetryFailureEvent = Readonly<{
  event: "research.persistence.retry_request_failed";
  errorType: string;
}>;

type Dependencies = {
  workflow: ResearchWorkflow;
  reportFailure?: (event: RetryFailureEvent) => void;
};

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function errorType(reason: unknown): string {
  return reason instanceof Error ? reason.name : "UnknownError";
}

export function createResearchPersistenceRetryHandler({
  workflow,
  reportFailure = (event) => {
    logger.error(event.event, {
      operation: "retry_research_persistence",
      errorCategory: "persistence_failure",
      retryStatus: "retryable",
      persistenceStatus: "pending",
      errorType: event.errorType,
    });
  },
}: Dependencies) {
  return async (retryId: string, owner: ResearchOwner): Promise<Response> => {
    try {
      if (!workflow.retry) {
        throw new ResearchFailure(
          "PERSISTENCE_UNAVAILABLE",
          "Persistence retry is not configured.",
        );
      }
      const result = await workflow.retry(retryId, owner);
      return Response.json(result, { headers: RESPONSE_HEADERS });
    } catch (reason) {
      const failure = reason instanceof ResearchFailure
        ? reason
        : new ResearchFailure(
            "PERSISTENCE_UNAVAILABLE",
            "Persistence retry failed.",
            reason,
          );
      reportFailure({
        event: "research.persistence.retry_request_failed",
        errorType: errorType(failure),
      });
      const body: ResearchErrorResponse = {
        error: {
          code: "PERSISTENCE_UNAVAILABLE",
          message:
            "Your research is still safe, but it could not be saved yet. Please retry saving.",
          retryable: true,
        },
      };
      return Response.json(body, { status: 503, headers: RESPONSE_HEADERS });
    }
  };
}
