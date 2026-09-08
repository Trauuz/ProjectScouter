import { describe, expect, it } from "vitest";

import {
  HERO_PROMPT_EXAMPLES,
  advanceHeroPlaceholder,
  heroPlaceholderText,
  initialHeroPlaceholder,
} from "./hero-placeholder";

describe("hero prompt examples", () => {
  it("cycles through five distinct ProjectScout prompts", () => {
    expect(HERO_PROMPT_EXAMPLES).toHaveLength(5);
    expect(new Set(HERO_PROMPT_EXAMPLES)).toHaveLength(5);
  });

  it("types, pauses, erases, and advances to the next prompt", () => {
    let state = initialHeroPlaceholder();

    for (let step = 0; step < HERO_PROMPT_EXAMPLES[0].length; step += 1) {
      state = advanceHeroPlaceholder(state);
    }
    expect(heroPlaceholderText(state)).toBe(HERO_PROMPT_EXAMPLES[0]);

    state = advanceHeroPlaceholder(state);
    expect(state.phase).toBe("pausing");
    state = advanceHeroPlaceholder(state);
    expect(state.phase).toBe("deleting");

    while (state.characterCount > 0) {
      state = advanceHeroPlaceholder(state);
    }
    state = advanceHeroPlaceholder(state);

    expect(state.promptIndex).toBe(1);
    expect(state.phase).toBe("typing");
    expect(heroPlaceholderText(state)).toBe("");
  });
});
