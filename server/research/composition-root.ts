import { RunResearch } from "./application/run-research";
import { RunResearchWithPersistence } from "./application/run-research-with-persistence";
import { getResearchRunRepository } from "./infrastructure/drizzle-research-run-repository";
import { MemoryRateLimiter } from "./infrastructure/memory-rate-limiter";
import {
  createRecommendationProvider,
  createResearchProvider,
} from "./infrastructure/provider-factory";
import { readResearchEnvironment } from "./infrastructure/research-environment";
import { createResearchPostHandler } from "./presentation/create-research-handler";

type ResearchPostHandler = ReturnType<typeof createResearchPostHandler>;

let handler: ResearchPostHandler | undefined;

export function getResearchPostHandler(): ResearchPostHandler {
  if (handler) {
    return handler;
  }

  const environment = readResearchEnvironment();
  const researchProvider = createResearchProvider(environment.research);
  const recommendationProvider = createRecommendationProvider(
    environment.recommendation,
  );

  handler = createResearchPostHandler({
    workflow: new RunResearchWithPersistence(
      new RunResearch(researchProvider, recommendationProvider),
      getResearchRunRepository,
    ),
    rateLimiter: new MemoryRateLimiter({
      maxRequests: 5,
      windowMs: 10 * 60 * 1_000,
    }),
  });

  return handler;
}
