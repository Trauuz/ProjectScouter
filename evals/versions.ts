import {
  RECOMMENDATION_PROMPT_VERSION,
  RESEARCH_PROMPT_VERSION,
} from "../server/research/application/ai-versions";
import type { EvaluationVersions } from "./types";

export const AI_EVALUATION_VERSIONS: EvaluationVersions = {
  dataset: "projectscout-adversarial-v1",
  prompts: {
    research: RESEARCH_PROMPT_VERSION,
    recommendation: RECOMMENDATION_PROMPT_VERSION,
  },
  models: {
    research: "synthetic-research-fixture-v1",
    recommendation: "synthetic-recommendation-fixture-v1",
  },
};
