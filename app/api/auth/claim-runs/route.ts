import { getActiveAuthIdentity } from "@/server/auth/get-auth-identity";
import { getResearchRunRepository } from "@/server/research/infrastructure/drizzle-research-run-repository";
import {
  getOrCreateVisitorSession,
  rotateCurrentVisitorSession,
} from "@/server/research/presentation/visitor-session";

import { createClaimRunsPostHandler } from "./claim-runs-handler";

export const runtime = "nodejs";

export const POST = createClaimRunsPostHandler({
  getIdentity: getActiveAuthIdentity,
  getVisitorSession: getOrCreateVisitorSession,
  attachResearchRuns: (sessionId, userId) =>
    getResearchRunRepository().attachResearchRunsToUser(
      sessionId,
      userId,
    ),
  rotateVisitorSession: rotateCurrentVisitorSession,
  reportFailure: (reason) =>
    console.error("[auth] Could not attach anonymous research runs", reason),
});
