import { getOptionalAuthIdentity } from "@/server/auth/get-auth-identity";
import { getMonthlyUsageMeter } from "@/server/usage/drizzle-monthly-usage-meter";

export const runtime = "nodejs";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(): Promise<Response> {
  const identity = await getOptionalAuthIdentity();
  if (!identity) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401, headers: RESPONSE_HEADERS },
    );
  }

  const usage = await getMonthlyUsageMeter().read(identity.id);
  return Response.json(usage, { headers: RESPONSE_HEADERS });
}
