import "server-only";

import { deleteAccountData } from "./delete-account-data";
import {
  requestAccountDeletion as runAccountDeletionRequest,
  type AccountDeletionJob,
  type AccountDeletionDependencies,
} from "./account-deletion-workflow";
import { retryAccountDeletions } from "./account-deletion-retry";
import { getAccountDeletionRepository } from "./drizzle-account-deletion-repository";
import { createSupabaseAdminClient } from "./supabase-admin-client";
import { deleteSupabaseAuthUser } from "./supabase-auth-user-deletion";

function dependencies(): AccountDeletionDependencies {
  const repository = getAccountDeletionRepository();
  const admin = createSupabaseAdminClient();
  return {
    repository,
    deleteAuthenticationUser: (userId) =>
      deleteSupabaseAuthUser(
        userId,
        (subjectId) => admin.auth.admin.deleteUser(subjectId),
      ),
    deleteApplicationData: deleteAccountData,
  };
}

export function requestAccountDeletion(
  userId: string,
  requestId: string,
): Promise<AccountDeletionJob> {
  return runAccountDeletionRequest(userId, dependencies(), requestId);
}

export function retryPendingAccountDeletions() {
  return retryAccountDeletions({ ...dependencies(), limit: 25 });
}

export async function canRunResearch(userId: string): Promise<boolean> {
  return !(await getAccountDeletionRepository().isAccessRevoked(userId));
}
