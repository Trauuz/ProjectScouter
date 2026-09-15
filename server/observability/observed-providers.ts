import "server-only";

import { ResearchFailure } from "../research/application/research-errors";
import type {
  RecommendationProvider,
  ResearchProvider,
} from "../research/application/research-ports";
import { logger as defaultLogger, StructuredLogger } from "./structured-logger";

function failureCategory(reason: unknown): "timeout" | "failure" {
  if (
    reason instanceof ResearchFailure &&
    reason.code === "UPSTREAM_TIMEOUT"
  ) {
    return "timeout";
  }
  if (reason instanceof DOMException && reason.name === "AbortError") {
    return "timeout";
  }
  return "failure";
}

function reportProviderFailure(
  logger: StructuredLogger,
  provider: string,
  operation: string,
  startedAt: number,
  reason: unknown,
): void {
  const category = failureCategory(reason);
  const durationMs = Date.now() - startedAt;
  logger.metric(`provider.${category}.count`, {
    provider,
    operation,
    value: 1,
  });
  logger.error("provider.request.failed", {
    provider,
    operation,
    durationMs,
    errorCategory: category,
    retryStatus: "retryable",
    persistenceStatus: "not_started",
  }, reason);
}

export function observeResearchProvider(
  provider: ResearchProvider,
  providerName: string,
  logger: StructuredLogger = defaultLogger,
): ResearchProvider {
  return {
    async research(prompt, signal) {
      const startedAt = Date.now();
      try {
        return await provider.research(prompt, signal);
      } catch (reason) {
        reportProviderFailure(
          logger,
          providerName,
          "research_provider",
          startedAt,
          reason,
        );
        throw reason;
      }
    },
  };
}

export function observeRecommendationProvider(
  provider: RecommendationProvider,
  providerName: string,
  logger: StructuredLogger = defaultLogger,
): RecommendationProvider {
  return {
    async generate(prompt, research, signal) {
      const startedAt = Date.now();
      try {
        return await provider.generate(prompt, research, signal);
      } catch (reason) {
        reportProviderFailure(
          logger,
          providerName,
          "recommendation_provider",
          startedAt,
          reason,
        );
        throw reason;
      }
    },
  };
}
