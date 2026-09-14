import { describe, expect, it, vi } from "vitest";

import { deleteSupabaseAuthUser } from "./supabase-auth-user-deletion";

const USER_ID = "4ba19a1f-48bc-49eb-b9cc-9af80ac03b78";

describe("deleteSupabaseAuthUser", () => {
  it("treats an already absent Auth user as an idempotent success", async () => {
    const deleteUser = vi.fn().mockResolvedValue({
      error: { status: 404, code: "user_not_found" },
    });

    await expect(deleteSupabaseAuthUser(USER_ID, deleteUser)).resolves.toBeUndefined();
  });

  it("surfaces transient Supabase failures for durable retry", async () => {
    const error = { status: 503, code: "service_unavailable" };

    await expect(
      deleteSupabaseAuthUser(
        USER_ID,
        vi.fn().mockResolvedValue({ error }),
      ),
    ).rejects.toBe(error);
  });
});
