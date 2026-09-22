import { observeRoute } from "@/server/observability/observe-route";
import { createLivenessHandler } from "@/server/health/health-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = observeRoute(
  "/api/health/live",
  createLivenessHandler(),
);
