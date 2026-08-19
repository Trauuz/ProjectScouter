import { z } from "zod";

import { ResearchFailure } from "../application/research-errors";
import {
  RECOMMENDATION_PROVIDER_NAMES,
  RESEARCH_PROVIDER_NAMES,
  type RecommendationProviderSettings,
  type ResearchProviderSettings,
} from "./provider-settings";

const optionalSetting = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

const rawEnvironmentSchema = z.object({
  RESEARCH_PROVIDER: z.enum(RESEARCH_PROVIDER_NAMES).optional(),
  RESEARCH_API_KEY: optionalSetting,
  RECOMMENDATION_PROVIDER: z.enum(RECOMMENDATION_PROVIDER_NAMES).optional(),
  RECOMMENDATION_API_KEY: optionalSetting,
  RECOMMENDATION_MODEL: optionalSetting,
  PERPLEXITY_API_KEY: optionalSetting,
  TAVILY_API_KEY: optionalSetting,
  OPENAI_API_KEY: optionalSetting,
  OPENAI_RECOMMENDATION_MODEL: optionalSetting,
  GEMINI_API_KEY: optionalSetting,
  GEMINI_RECOMMENDATION_MODEL: optionalSetting,
});

// Legacy aliases remain confined to this adapter so existing deployments can
// migrate without leaking provider-specific names into composition or use cases.
const environmentSchema = rawEnvironmentSchema
  .transform((source) => ({
    research: {
      provider: source.RESEARCH_PROVIDER ?? RESEARCH_PROVIDER_NAMES[0],
      apiKey:
        source.RESEARCH_API_KEY ??
        source.TAVILY_API_KEY ??
        source.PERPLEXITY_API_KEY,
    },
    recommendation: {
      provider:
        source.RECOMMENDATION_PROVIDER ?? RECOMMENDATION_PROVIDER_NAMES[0],
      apiKey:
        source.RECOMMENDATION_API_KEY ??
        source.GEMINI_API_KEY ??
        source.OPENAI_API_KEY,
      model:
        source.RECOMMENDATION_MODEL ??
        source.GEMINI_RECOMMENDATION_MODEL ??
        source.OPENAI_RECOMMENDATION_MODEL,
    },
  }))
  .pipe(
    z.object({
      research: z.object({
        provider: z.enum(RESEARCH_PROVIDER_NAMES),
        apiKey: z.string().min(1),
      }),
      recommendation: z.object({
        provider: z.enum(RECOMMENDATION_PROVIDER_NAMES),
        apiKey: z.string().min(1),
        model: z.string().min(1),
      }),
    }),
  );

export type ResearchEnvironment = {
  research: ResearchProviderSettings;
  recommendation: RecommendationProviderSettings;
};

export function readResearchEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
): ResearchEnvironment {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    throw new ResearchFailure(
      "SERVER_MISCONFIGURED",
      "Required research provider environment variables are missing.",
    );
  }

  return result.data;
}
