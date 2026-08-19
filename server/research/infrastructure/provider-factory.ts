import Perplexity from "@perplexity-ai/perplexity_ai";
import OpenAI from "openai";

import type {
  RecommendationProvider,
  ResearchProvider,
} from "../application/research-ports";
import { GeminiRecommendationProvider } from "./gemini-recommendation-provider";
import { OpenAiRecommendationProvider } from "./openai-recommendation-provider";
import { PerplexityResearchProvider } from "./perplexity-research-provider";
import type {
  RecommendationProviderName,
  RecommendationProviderSettings,
  ResearchProviderName,
  ResearchProviderSettings,
} from "./provider-settings";
import { TavilyResearchProvider } from "./tavily-research-provider";

type RecommendationProviderBuilder = (
  settings: RecommendationProviderSettings,
) => RecommendationProvider;
type ResearchProviderBuilder = (
  settings: ResearchProviderSettings,
) => ResearchProvider;

const recommendationProviderBuilders: Record<
  RecommendationProviderName,
  RecommendationProviderBuilder
> = {
  openai: (settings) =>
    new OpenAiRecommendationProvider(
      new OpenAI({
        apiKey: settings.apiKey,
        timeout: 25_000,
        maxRetries: 0,
      }),
      settings.model,
    ),
  gemini: (settings) =>
    new GeminiRecommendationProvider(settings.apiKey, settings.model),
};

const researchProviderBuilders: Record<
  ResearchProviderName,
  ResearchProviderBuilder
> = {
  perplexity: (settings) =>
    new PerplexityResearchProvider(
      new Perplexity({
        apiKey: settings.apiKey,
        timeout: 55_000,
        maxRetries: 0,
      }),
    ),
  tavily: (settings) => new TavilyResearchProvider(settings.apiKey),
};

export function createRecommendationProvider(
  settings: RecommendationProviderSettings,
): RecommendationProvider {
  return recommendationProviderBuilders[settings.provider](settings);
}

export function createResearchProvider(
  settings: ResearchProviderSettings,
): ResearchProvider {
  return researchProviderBuilders[settings.provider](settings);
}
