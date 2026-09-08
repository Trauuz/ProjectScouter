import { describe, expect, it, vi } from "vitest";

import { completeSignOut, SIGN_OUT_FAILURE_MESSAGE } from "./sign-out";

describe("completeSignOut", () => {
  it("revokes only the current session before clearing local auth state", async () => {
    const revoke = vi.fn().mockResolvedValue({ error: null });
    const onRevoked = vi.fn();
    const onFailure = vi.fn();

    const result = await completeSignOut({ revoke, onRevoked, onFailure });

    expect(revoke).toHaveBeenCalledWith({ scope: "local" });
    expect(onRevoked).toHaveBeenCalledOnce();
    expect(onFailure).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });

  it("preserves local auth state when Supabase rejects revocation", async () => {
    const reason = new Error("network unavailable");
    const onRevoked = vi.fn();
    const onFailure = vi.fn();

    const result = await completeSignOut({
      revoke: vi.fn().mockResolvedValue({ error: reason }),
      onRevoked,
      onFailure,
    });

    expect(onRevoked).not.toHaveBeenCalled();
    expect(onFailure).toHaveBeenCalledWith(reason);
    expect(result).toEqual({ ok: false, message: SIGN_OUT_FAILURE_MESSAGE });
  });

  it("reports unexpected revocation failures without clearing local auth state", async () => {
    const reason = new Error("request failed");
    const onRevoked = vi.fn();
    const onFailure = vi.fn();

    const result = await completeSignOut({
      revoke: vi.fn().mockRejectedValue(reason),
      onRevoked,
      onFailure,
    });

    expect(onRevoked).not.toHaveBeenCalled();
    expect(onFailure).toHaveBeenCalledWith(reason);
    expect(result).toEqual({ ok: false, message: SIGN_OUT_FAILURE_MESSAGE });
  });
});
