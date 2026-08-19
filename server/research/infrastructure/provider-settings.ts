export const RESEARCH_PROVIDER_NAMES = ["perplexity", "tavily"] as const;
export const RECOMMENDATION_PROVIDER_NAMES = ["openai", "gemini"] as const;

export type ResearchProviderName = (typeof RESEARCH_PROVIDER_NAMES)[number];
export type RecommendationProviderName =
  (typeof RECOMMENDATION_PROVIDER_NAMES)[number];

export type ResearchProviderSettings = {
  provider: ResearchProviderName;
  apiKey: string;
};

export type RecommendationProviderSettings = {
  provider: RecommendationProviderName;
  apiKey: string;
  model: string;
};
