export const HERO_PROMPT_EXAMPLES = [
  "A budgeting app for first-time freelancers",
  "A study planner for students with shifting schedules",
  "A neighborhood tool for sharing rarely used equipment",
  "A meal-planning app for people with food allergies",
  "A client feedback portal for small creative agencies",
] as const;

export type HeroPlaceholderPhase = "typing" | "pausing" | "deleting";

export type HeroPlaceholder = {
  promptIndex: number;
  characterCount: number;
  phase: HeroPlaceholderPhase;
};

export const HERO_PLACEHOLDER_DELAY_MS: Record<HeroPlaceholderPhase, number> = {
  typing: 55,
  pausing: 1_700,
  deleting: 30,
};

export function initialHeroPlaceholder(): HeroPlaceholder {
  return { promptIndex: 0, characterCount: 0, phase: "typing" };
}

export function heroPlaceholderText(state: HeroPlaceholder): string {
  return HERO_PROMPT_EXAMPLES[state.promptIndex].slice(0, state.characterCount);
}

export function advanceHeroPlaceholder(
  state: HeroPlaceholder,
): HeroPlaceholder {
  const promptLength = HERO_PROMPT_EXAMPLES[state.promptIndex].length;

  if (state.phase === "typing" && state.characterCount < promptLength) {
    return { ...state, characterCount: state.characterCount + 1 };
  }
  if (state.phase === "typing") {
    return { ...state, phase: "pausing" };
  }
  if (state.phase === "pausing") {
    return { ...state, phase: "deleting" };
  }
  if (state.characterCount > 0) {
    return { ...state, characterCount: state.characterCount - 1 };
  }

  return {
    promptIndex: (state.promptIndex + 1) % HERO_PROMPT_EXAMPLES.length,
    characterCount: 0,
    phase: "typing",
  };
}
