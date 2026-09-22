import { createReadinessHandler } from "@/server/health/health-handler";
import {
  projectScoutReadinessChecks,
  READINESS_CHECK_TIMEOUT_MS,
  reportReadinessFailure,
} from "@/server/health/readiness-checks";
import { observeRoute } from "@/server/observability/observe-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = observeRoute(
  "/api/health/ready",
  createReadinessHandler({
    checks: projectScoutReadinessChecks(),
    timeoutMs: READINESS_CHECK_TIMEOUT_MS,
    reportFailure: reportReadinessFailure,
  }),
);
