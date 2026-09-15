import type { AuthIdentity } from "@/shared/auth/auth-identity";
import { ResearchFailure } from "@/server/research/application/research-errors";
import type { VisitorSessionId } from "@/server/research/domain/research-owner";
import type { ResearchErrorResponse } from "@/server/research/domain/research-report";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

type Dependencies = {
  getIdentity(): Promise<AuthIdentity | null>;
  getVisitorSession(): Promise<VisitorSessionId>;
  getHandler(): (
    request: Request,
    owner: { sessionId: VisitorSessionId; userId: string },
  ) => Promise<Response>;
  observeUser(userId: string): void;
};

function failureResponse(reason: unknown): Response {
  const misconfigured =
    reason instanceof ResearchFailure &&
    reason.code === "SERVER_MISCONFIGURED";
  const body: ResearchErrorResponse = {
    error: {
      code: misconfigured ? "SERVER_MISCONFIGURED" : "UPSTREAM_FAILED",
      message: misconfigured
        ? "The research service is not configured."
        : "The research service could not start.",
      retryable: !misconfigured,
    },
  };

  return Response.json(body, {
    status: misconfigured ? 500 : 502,
    headers: RESPONSE_HEADERS,
  });
}

export function createResearchRouteHandler(dependencies: Dependencies) {
  return async function postResearch(request: Request): Promise<Response> {
    try {
      const identity = await dependencies.getIdentity();
      if (!identity) {
        const body: ResearchErrorResponse = {
          error: {
            code: "AUTH_REQUIRED",
            message: "Log in or create an account to run research.",
            retryable: true,
          },
        };
        return Response.json(body, { status: 401, headers: RESPONSE_HEADERS });
      }

      const sessionId = await dependencies.getVisitorSession();
      dependencies.observeUser(identity.id);
      return await dependencies.getHandler()(request, {
        sessionId,
        userId: identity.id,
      });
    } catch (reason) {
      return failureResponse(reason);
    }
  };
}
