import { getActiveAuthIdentity } from "@/server/auth/get-auth-identity";
import { getResearchRunRepository } from "@/server/research/infrastructure/drizzle-research-run-repository";
import {
  getOrCreateVisitorSession,
  rotateCurrentVisitorSession,
} from "@/server/research/presentation/visitor-session";

import { createClaimRunsPostHandler } from "./claim-runs-handler";
import { observeRoute } from "@/server/observability/observe-route";
import { logger, setObservedUser } from "@/server/observability/structured-logger";

export const runtime = "nodejs";

const claimRuns = createClaimRunsPostHandler({
  getIdentity: getActiveAuthIdentity,
  getVisitorSession: getOrCreateVisitorSession,
  attachResearchRuns: (sessionId, userId) => {
    setObservedUser(userId);
    return getResearchRunRepository().attachResearchRunsToUser(
      sessionId,
      userId,
    );
  },
  rotateVisitorSession: rotateCurrentVisitorSession,
  reportFailure: (reason) => logger.error("auth.research_claim.failed", {
    operation: "claim_anonymous_research",
    errorCategory: "persistence_failure",
    retryStatus: "retryable",
  }, reason),
});

export const POST = observeRoute("/api/auth/claim-runs", claimRuns);
