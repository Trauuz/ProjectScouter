import { getOptionalAuthIdentity } from "@/server/auth/get-auth-identity";
import { ResearchFailure } from "@/server/research/application/research-errors";
import { getResearchPostHandler } from "@/server/research/composition-root";
import type { ResearchErrorResponse } from "@/server/research/domain/research-report";
import { getOrCreateVisitorSession } from "@/server/research/presentation/visitor-session";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const identity = await getOptionalAuthIdentity();
    if (!identity) {
      const body: ResearchErrorResponse = {
        error: {
          code: "AUTH_REQUIRED",
          message: "Log in or create an account to run research.",
          retryable: true,
        },
      };
      return Response.json(body, {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const sessionId = await getOrCreateVisitorSession();
    return await getResearchPostHandler()(request, {
      sessionId,
      userId: identity.id,
    });
  } catch (reason) {
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
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
}
