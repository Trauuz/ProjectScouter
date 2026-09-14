import { describe, expect, it, vi } from "vitest";

import { completeAccountDeletion } from "./account-deletion-client";

describe("completeAccountDeletion", () => {
  it("clears user-specific browser data only after server deletion succeeds", async () => {
    const events: string[] = [];

    const result = await completeAccountDeletion({
      deleteFromServer: async () => {
        events.push("server");
        return { ok: true, status: 204 };
      },
      clearLocalAccountData: () => events.push("clear-local"),
      revokeLocalSession: async () => {
        events.push("revoke-session");
        return { error: null };
      },
      onDeleted: () => events.push("deleted"),
      onFailure: vi.fn(),
      onSessionCleanupFailure: vi.fn(),
    });

    expect(result).toEqual({ ok: true });
    expect(events).toEqual([
      "server",
      "clear-local",
      "revoke-session",
      "deleted",
    ]);
  });

  it("preserves local and in-memory data when server deletion fails", async () => {
    const clearLocalAccountData = vi.fn();
    const revokeLocalSession = vi.fn();
    const onDeleted = vi.fn();

    const result = await completeAccountDeletion({
      deleteFromServer: async () => ({ ok: false, status: 503 }),
      clearLocalAccountData,
      revokeLocalSession,
      onDeleted,
      onFailure: vi.fn(),
      onSessionCleanupFailure: vi.fn(),
    });

    expect(result).toEqual({
      ok: false,
      message: "Your account could not be deleted. Please try again.",
    });
    expect(clearLocalAccountData).not.toHaveBeenCalled();
    expect(revokeLocalSession).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
