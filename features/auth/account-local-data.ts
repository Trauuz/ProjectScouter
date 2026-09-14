import {
  createBrowserPromptHistoryStore,
  type PromptHistoryStore,
} from "../research/prompt-history/prompt-history-store";

import {
  createPendingAuthIntentStore,
  type LocalPendingAuthIntentStore,
} from "./pending-auth-intent-store";

type ClearablePromptHistory = Pick<PromptHistoryStore, "clear">;
type ClearablePendingIntent = Pick<LocalPendingAuthIntentStore, "clear">;
type AccountLocalDataClearedListener = () => void;

const clearedListeners = new Set<AccountLocalDataClearedListener>();

export function subscribeToAccountLocalDataCleared(
  listener: AccountLocalDataClearedListener,
): () => void {
  clearedListeners.add(listener);
  return () => clearedListeners.delete(listener);
}

export function clearAccountLocalData({
  promptHistory,
  pendingAuthIntent,
}: {
  promptHistory: ClearablePromptHistory;
  pendingAuthIntent: ClearablePendingIntent;
}): void {
  let cleanupFailure: unknown;

  try {
    promptHistory.clear();
  } catch (reason) {
    cleanupFailure = reason;
  }

  try {
    pendingAuthIntent.clear();
  } catch (reason) {
    cleanupFailure ??= reason;
  }

  for (const listener of clearedListeners) {
    try {
      listener();
    } catch (reason) {
      cleanupFailure ??= reason;
    }
  }

  if (cleanupFailure) {
    throw cleanupFailure;
  }
}

export function clearBrowserAccountData(): void {
  clearAccountLocalData({
    promptHistory: createBrowserPromptHistoryStore(),
    pendingAuthIntent: createPendingAuthIntentStore(),
  });
}
