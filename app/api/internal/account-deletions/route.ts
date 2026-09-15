import { retryPendingAccountDeletions } from "@/server/auth/account-deletion-service";

import { createAccountDeletionRetryHandler } from "./account-deletion-retry-handler";
import { observeRoute } from "@/server/observability/observe-route";
import { logger } from "@/server/observability/structured-logger";

export const runtime = "nodejs";

function reportFailure(reason: unknown): void {
  logger.error("account_deletion.retry_worker.failed", {
    operation: "retry_account_deletions",
    errorCategory: "deletion_failure",
    retryStatus: "retryable",
  }, reason);
  logger.metric("deletion.failure.count", { value: 1 });
}

const retryDeletions = createAccountDeletionRetryHandler({
  expectedSecret: process.env.ACCOUNT_DELETION_WORKER_SECRET?.trim(),
  retry: retryPendingAccountDeletions,
  reportFailure,
});

export const POST = observeRoute(
  "/api/internal/account-deletions",
  retryDeletions,
);
