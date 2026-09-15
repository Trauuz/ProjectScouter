import { RunResearch } from "./application/run-research";
import { RunResearchWithPersistence } from "./application/run-research-with-persistence";
import { getResearchPersistenceJobStore } from "./infrastructure/drizzle-research-persistence-job-store";
import { MemoryRateLimiter } from "./infrastructure/memory-rate-limiter";
import {
  createRecommendationProvider,
  createResearchProvider,
} from "./infrastructure/provider-factory";
import { readResearchEnvironment } from "./infrastructure/research-environment";
import { createResearchPostHandler } from "./presentation/create-research-handler";
import { getMonthlyUsageMeter } from "@/server/usage/drizzle-monthly-usage-meter";
import { canRunResearch } from "@/server/auth/account-deletion-service";
import {
  observeRecommendationProvider,
  observeResearchProvider,
} from "@/server/observability/observed-providers";

type ResearchPostHandler = ReturnType<typeof createResearchPostHandler>;

let handler: ResearchPostHandler | undefined;
let workflow: RunResearchWithPersistence | undefined;

export function getResearchWorkflow(): RunResearchWithPersistence {
  if (workflow) {
    return workflow;
  }

  const environment = readResearchEnvironment();
  workflow = new RunResearchWithPersistence(
    new RunResearch(
      observeResearchProvider(
        createResearchProvider(environment.research),
        environment.research.provider,
      ),
      observeRecommendationProvider(
        createRecommendationProvider(environment.recommendation),
        environment.recommendation.provider,
      ),
    ),
    getResearchPersistenceJobStore(),
  );
  return workflow;
}

export function getResearchPostHandler(): ResearchPostHandler {
  if (handler) {
    return handler;
  }

  handler = createResearchPostHandler({
    workflow: getResearchWorkflow(),
    rateLimiter: new MemoryRateLimiter({
      maxRequests: 5,
      windowMs: 10 * 60 * 1_000,
    }),
    usageMeter: getMonthlyUsageMeter(),
    accountAccess: { canResearch: canRunResearch },
  });

  return handler;
}
