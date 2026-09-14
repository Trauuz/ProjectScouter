import { describe, expect, it, vi } from "vitest";

import { clearAccountLocalData, subscribeToAccountLocalDataCleared } from "./account-local-data";

describe("clearAccountLocalData", () => {
  it("clears every user-specific store and notifies in-memory consumers", () => {
    const promptHistory = { clear: vi.fn() };
    const pendingAuthIntent = { clear: vi.fn() };
    const listener = vi.fn();
    const unsubscribe = subscribeToAccountLocalDataCleared(listener);

    clearAccountLocalData({ promptHistory, pendingAuthIntent });
    unsubscribe();

    expect(promptHistory.clear).toHaveBeenCalledOnce();
    expect(pendingAuthIntent.clear).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledOnce();
  });

  it("still clears in-memory consumers when a persistent store rejects cleanup", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAccountLocalDataCleared(listener);

    expect(() =>
      clearAccountLocalData({
        promptHistory: {
          clear: () => {
            throw new Error("storage unavailable");
          },
        },
        pendingAuthIntent: { clear: vi.fn() },
      }),
    ).toThrow("storage unavailable");
    unsubscribe();

    expect(listener).toHaveBeenCalledOnce();
  });
});
