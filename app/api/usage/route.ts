import { getActiveAuthIdentity } from "@/server/auth/get-auth-identity";
import { getMonthlyUsageMeter } from "@/server/usage/drizzle-monthly-usage-meter";
import { observeRoute } from "@/server/observability/observe-route";
import { setObservedUser } from "@/server/observability/structured-logger";

export const runtime = "nodejs";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

async function getUsage(): Promise<Response> {
  const identity = await getActiveAuthIdentity();
  if (!identity) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401, headers: RESPONSE_HEADERS },
    );
  }

  setObservedUser(identity.id);
  const usage = await getMonthlyUsageMeter().read(identity.id);
  return Response.json(usage, { headers: RESPONSE_HEADERS });
}

export const GET = observeRoute("/api/usage", () => getUsage());
