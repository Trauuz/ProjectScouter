import { getOptionalAuthIdentity } from "@/server/auth/get-auth-identity";
import { getResearchWorkflow } from "@/server/research/composition-root";
import { createResearchPersistenceRetryHandler } from "@/server/research/presentation/create-research-retry-handler";
import { getOrCreateVisitorSession } from "@/server/research/presentation/visitor-session";
import { observeRoute } from "@/server/observability/observe-route";
import { setObservedUser } from "@/server/observability/structured-logger";

export const runtime = "nodejs";

function sameOrigin(request: Request): boolean {
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

async function retryPersistence(
  request: Request,
  context: { params: Promise<{ retryId: string }> },
): Promise<Response> {
  if (!sameOrigin(request)) {
    return Response.json(
      {
        error: {
          code: "FORBIDDEN_ORIGIN",
          message: "Cross-origin research requests are not allowed.",
          retryable: false,
        },
      },
      { status: 403 },
    );
  }

  const identity = await getOptionalAuthIdentity();
  if (!identity) {
    return Response.json(
      {
        error: {
          code: "AUTH_REQUIRED",
          message: "Log in to retry saving this research.",
          retryable: true,
        },
      },
      { status: 401 },
    );
  }

  const { retryId } = await context.params;
  const sessionId = await getOrCreateVisitorSession();
  setObservedUser(identity.id);
  return createResearchPersistenceRetryHandler({
    workflow: getResearchWorkflow(),
  })(retryId, { sessionId, userId: identity.id });
}

export const POST = observeRoute(
  "/api/research/persistence/[retryId]",
  retryPersistence,
);
