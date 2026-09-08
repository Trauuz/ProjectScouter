import type { AuthActionResult } from "./auth-context";

export const SIGN_OUT_FAILURE_MESSAGE =
  "Logout could not be completed. Check your connection and try again.";

type SignOutScope = { scope: "local" };

type CompleteSignOutDependencies = {
  revoke(options: SignOutScope): Promise<{ error: unknown | null }>;
  onRevoked(): void;
  onFailure(reason: unknown): void;
};

export async function completeSignOut({
  revoke,
  onRevoked,
  onFailure,
}: CompleteSignOutDependencies): Promise<AuthActionResult> {
  try {
    const { error } = await revoke({ scope: "local" });
    if (error) {
      onFailure(error);
      return { ok: false, message: SIGN_OUT_FAILURE_MESSAGE };
    }
  } catch (reason) {
    onFailure(reason);
    return { ok: false, message: SIGN_OUT_FAILURE_MESSAGE };
  }

  onRevoked();
  return { ok: true };
}
