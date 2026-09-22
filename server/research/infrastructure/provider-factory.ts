import Perplexity from "@perplexity-ai/perplexity_ai";
import OpenAI from "openai";

import type {
  MeteredRecommendationProvider,
  MeteredResearchProvider,
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
) => MeteredRecommendationProvider;
type ResearchProviderBuilder = (
  settings: ResearchProviderSettings,
  creditsPerCall: number,
) => MeteredResearchProvider;

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
  perplexity: (settings, creditsPerCall) =>
    new PerplexityResearchProvider(
      new Perplexity({
        apiKey: settings.apiKey,
        timeout: 55_000,
        maxRetries: 0,
      }),
      settings.mode,
      creditsPerCall,
    ),
  tavily: (settings, creditsPerCall) =>
    new TavilyResearchProvider(
      settings.apiKey,
      settings.mode,
      creditsPerCall,
    ),
};

export function createRecommendationProvider(
  settings: RecommendationProviderSettings,
): MeteredRecommendationProvider {
  return recommendationProviderBuilders[settings.provider](settings);
}

export function createResearchProvider(
  settings: ResearchProviderSettings,
  creditsPerCall: number,
): MeteredResearchProvider {
  return researchProviderBuilders[settings.provider](settings, creditsPerCall);
}
