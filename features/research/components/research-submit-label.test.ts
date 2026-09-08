import { describe, expect, it } from "vitest";

import { researchSubmitLabel } from "./research-submit-label";

describe("research submit label", () => {
  it("describes a new research run while idle", () => {
    expect(researchSubmitLabel("idle")).toBe("Run research");
  });

  it("announces the in-flight research state", () => {
    expect(researchSubmitLabel("loading")).toBe("Researching…");
  });

  it("describes starting another run after success", () => {
    expect(researchSubmitLabel("success")).toBe("Run new research");
  });
});
