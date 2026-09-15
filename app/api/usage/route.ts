import { getActiveAuthIdentity } from "@/server/auth/get-auth-identity";
import { getMonthlyUsageMeter } from "@/server/usage/drizzle-monthly-usage-meter";
import { observeRoute } from "@/server/observability/observe-route";

import { createUsageHandler } from "./usage-handler";

export const runtime = "nodejs";

const usageHandler = createUsageHandler({
  getIdentity: getActiveAuthIdentity,
  readUsage: (userId) => getMonthlyUsageMeter().read(userId),
});

export const GET = observeRoute("/api/usage", usageHandler);
