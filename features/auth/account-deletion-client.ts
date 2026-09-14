import type { AuthActionResult } from "./auth-context";

const FAILURE_MESSAGE = "Your account could not be deleted. Please try again.";

type DeletionResponse = {
  ok: boolean;
  status: number;
};

export async function completeAccountDeletion({
  deleteFromServer,
  clearLocalAccountData,
  revokeLocalSession,
  onDeleted,
  onFailure,
  onLocalCleanupFailure = () => undefined,
  onSessionCleanupFailure,
}: {
  deleteFromServer(): Promise<DeletionResponse>;
  clearLocalAccountData(): void;
  revokeLocalSession(): Promise<{ error: unknown | null }>;
  onDeleted(): void;
  onFailure(reason: unknown): void;
  onLocalCleanupFailure?(reason: unknown): void;
  onSessionCleanupFailure(reason: unknown): void;
}): Promise<AuthActionResult> {
  let response: DeletionResponse;
  try {
    response = await deleteFromServer();
    if (!response.ok) {
      throw new Error(`Account deletion failed with status ${response.status}.`);
    }
  } catch (reason) {
    onFailure(reason);
    return { ok: false, message: FAILURE_MESSAGE };
  }

  try {
    clearLocalAccountData();
  } catch (reason) {
    onLocalCleanupFailure(reason);
  }

  try {
    const { error } = await revokeLocalSession();
    if (error) {
      onSessionCleanupFailure(error);
    }
  } catch (reason) {
    onSessionCleanupFailure(reason);
  }

  onDeleted();
  return { ok: true };
}
