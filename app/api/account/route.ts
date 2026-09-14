import { requestAccountDeletion } from "@/server/auth/account-deletion-service";
import { getOptionalAuthIdentity } from "@/server/auth/get-auth-identity";

import { createAccountDeleteHandler } from "./account-deletion-handler";

export const runtime = "nodejs";

function reportFailure(requestId: string, reason: unknown): void {
  const failureType = reason instanceof Error ? reason.name : "UnknownFailure";
  console.error("[account-deletion] Request processing failed", {
    requestId,
    failureType,
  });
}

export const DELETE = createAccountDeleteHandler({
  createRequestId: () => crypto.randomUUID(),
  getIdentity: getOptionalAuthIdentity,
  requestDeletion: requestAccountDeletion,
  reportFailure,
});
