import { describe, expect, it } from "vitest";

import { researchComposerLayout } from "./research-composer-layout";

describe("research composer layout", () => {
  it("keeps the compact layout for one line of text", () => {
    expect(researchComposerLayout(40, 40, 2)).toEqual({
      height: 42,
      multiline: false,
    });
  });

  it("expands and moves the action row when the prompt wraps", () => {
    expect(researchComposerLayout(88, 40, 2)).toEqual({
      height: 90,
      multiline: true,
    });
  });
});
