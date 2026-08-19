import { getOptionalAuthIdentity } from "@/server/auth/get-auth-identity";
import { getResearchRunRepository } from "@/server/research/infrastructure/drizzle-research-run-repository";
import { getOrCreateVisitorSession } from "@/server/research/presentation/visitor-session";

export const runtime = "nodejs";

function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) {
    return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  }

  const identity = await getOptionalAuthIdentity();
  if (!identity) {
    return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  try {
    const sessionId = await getOrCreateVisitorSession();
    const attached = await getResearchRunRepository().attachResearchRunsToUser(
      sessionId,
      identity.id,
    );
    return Response.json(
      { attached },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (reason) {
    console.error("[auth] Could not attach anonymous research runs", reason);
    return Response.json({ error: "CLAIM_FAILED" }, { status: 503 });
  }
}

