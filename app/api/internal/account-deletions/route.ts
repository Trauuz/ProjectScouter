import { retryPendingAccountDeletions } from "@/server/auth/account-deletion-service";

import { createAccountDeletionRetryHandler } from "./account-deletion-retry-handler";

export const runtime = "nodejs";

function reportFailure(reason: unknown): void {
  const failureType = reason instanceof Error ? reason.name : "UnknownFailure";
  console.error("[account-deletion] Retry worker failed", { failureType });
}

export const POST = createAccountDeletionRetryHandler({
  expectedSecret: process.env.ACCOUNT_DELETION_WORKER_SECRET?.trim(),
  retry: retryPendingAccountDeletions,
  reportFailure,
});
