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
} from "../observability/observed-providers";
import { logger } from "../observability/structured-logger";
import {
  ledgerRecommendationProvider,
  ledgerResearchProvider,
} from "../provider-usage/application/ledgered-providers";
import { ProviderUsageMonitor } from "../provider-usage/application/provider-usage-monitor";
import { RecordProviderCall } from "../provider-usage/application/record-provider-call";
import { getProviderUsageLedger } from "../provider-usage/infrastructure/drizzle-provider-usage-ledger";
import { readProviderUsageEnvironment } from "../provider-usage/infrastructure/provider-usage-environment";

type ResearchPostHandler = ReturnType<typeof createResearchPostHandler>;

let handler: ResearchPostHandler | undefined;
let workflow: RunResearchWithPersistence | undefined;

export function getResearchWorkflow(): RunResearchWithPersistence {
  if (workflow) {
    return workflow;
  }

  const environment = readResearchEnvironment();
  const usageEnvironment = readProviderUsageEnvironment();
  const usageLedger = getProviderUsageLedger();
  const usageMonitor = new ProviderUsageMonitor(
    usageLedger,
    {
      ...usageEnvironment.alerts,
      researchMonthlyCreditCeiling:
        usageEnvironment.limits.researchMonthlyCredits,
      recommendationDailyCallCeiling:
        usageEnvironment.limits.recommendationDailyCalls,
    },
    logger,
  );
  workflow = new RunResearchWithPersistence(
    new RunResearch(
      observeResearchProvider(
        ledgerResearchProvider(
          createResearchProvider(
            environment.research,
            usageEnvironment.limits.researchCreditsPerCall,
          ),
          new RecordProviderCall(
            usageLedger,
            {
              provider: environment.research.provider,
              operation: "research",
              modelOrMode: environment.research.mode,
              pricing: usageEnvironment.pricing.research,
            },
            undefined,
            usageMonitor,
          ),
        ),
        environment.research.provider,
      ),
      observeRecommendationProvider(
        ledgerRecommendationProvider(
          createRecommendationProvider(environment.recommendation),
          new RecordProviderCall(
            usageLedger,
            {
              provider: environment.recommendation.provider,
              operation: "recommendation",
              modelOrMode: environment.recommendation.model,
              pricing: usageEnvironment.pricing.recommendation,
            },
            undefined,
            usageMonitor,
          ),
        ),
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
