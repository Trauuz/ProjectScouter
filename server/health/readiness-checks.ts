import "server-only";

import { validateProductionEnvironment } from "@/server/config/production-environment";
import { checkDatabaseConnection } from "@/server/database/client";
import { logger } from "@/server/observability/structured-logger";
import type { ReadinessCheck, ReadinessFailure } from "./health-handler";

export const READINESS_CHECK_TIMEOUT_MS = 1_500;

export function projectScoutReadinessChecks(): readonly ReadinessCheck[] {
  return [
    {
      name: "configuration",
      run: async () => {
        validateProductionEnvironment();
      },
    },
    {
      name: "database",
      run: async (signal) => {
        await checkDatabaseConnection(signal);
      },
    },
  ];
}

export function reportReadinessFailure(failure: ReadinessFailure): void {
  logger.error("health.readiness.failed", {
    operation: "readiness_check",
    errorCategory: failure.timedOutChecks.length > 0
      ? "dependency_timeout"
      : "dependency_unavailable",
    retryStatus: "retryable",
    duration: failure.durationMs,
    failedChecks: failure.failedChecks,
    timedOutChecks: failure.timedOutChecks,
  });
}
