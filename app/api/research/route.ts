import { getOptionalAuthIdentity } from "@/server/auth/get-auth-identity";
import { getResearchPostHandler } from "@/server/research/composition-root";
import { getOrCreateVisitorSession } from "@/server/research/presentation/visitor-session";
import { observeRoute } from "@/server/observability/observe-route";
import { setObservedUser } from "@/server/observability/structured-logger";
import { createResearchRouteHandler } from "./research-route-handler";

export const runtime = "nodejs";

const postResearch = createResearchRouteHandler({
  getIdentity: getOptionalAuthIdentity,
  getVisitorSession: getOrCreateVisitorSession,
  getHandler: getResearchPostHandler,
  observeUser: setObservedUser,
});

export const POST = observeRoute("/api/research", postResearch);
