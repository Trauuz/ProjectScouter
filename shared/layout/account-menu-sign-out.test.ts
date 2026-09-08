import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("account menu sign out", () => {
  it("exposes pending and accessible failure feedback", () => {
    const source = readFileSync("shared/layout/account-menu.tsx", "utf8");

    expect(source).toContain("await onSignOut()");
    expect(source).toContain("disabled={signOutPending}");
    expect(source).toContain('aria-busy={signOutPending}');
    expect(source).toContain('role="alert"');
    expect(source).toContain('signOutPending ? "Logging out…" : "Log out"');
  });
});
