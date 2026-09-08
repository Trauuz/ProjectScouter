import { describe, expect, it } from "vitest";

import { composerViewport } from "./hero-composer-layout";

describe("hero composer layout", () => {
  it("shows the full wrapped prompt when it fits within the composer limit", () => {
    expect(composerViewport(88)).toEqual({
      height: 88,
      overflowY: "hidden",
    });
  });

  it("keeps exceptionally long prompts scrollable within the composer limit", () => {
    expect(composerViewport(280)).toEqual({
      height: 224,
      overflowY: "auto",
    });
  });
});
