import { requestAccountDeletion } from "@/server/auth/account-deletion-service";
import { getOptionalAuthIdentity } from "@/server/auth/get-auth-identity";
import { observeRoute } from "@/server/observability/observe-route";
import { logger, setObservedUser } from "@/server/observability/structured-logger";

import { createAccountDeleteHandler } from "./account-deletion-handler";

export const runtime = "nodejs";

function reportFailure(requestId: string, reason: unknown): void {
  logger.error("account_deletion.request.failed", {
    operation: "request_account_deletion",
    operationId: requestId,
    errorCategory: "deletion_failure",
    retryStatus: "retryable",
  }, reason);
  logger.metric("deletion.failure.count", { value: 1 });
}

const deleteAccount = createAccountDeleteHandler({
  createRequestId: () => crypto.randomUUID(),
  getIdentity: async () => {
    const identity = await getOptionalAuthIdentity();
    if (identity) {
      setObservedUser(identity.id);
    }
    return identity;
  },
  requestDeletion: requestAccountDeletion,
  reportFailure,
});

export const DELETE = observeRoute("/api/account", deleteAccount);
