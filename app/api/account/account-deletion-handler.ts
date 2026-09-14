import type { AuthIdentity } from "@/shared/auth/auth-identity";
import type { AccountDeletionJob } from "@/server/auth/account-deletion-workflow";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

type Dependencies = {
  createRequestId(): string;
  getIdentity(): Promise<AuthIdentity | null>;
  requestDeletion(userId: string, requestId: string): Promise<AccountDeletionJob>;
  reportFailure(requestId: string, reason: unknown): void;
};

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

export function createAccountDeleteHandler(dependencies: Dependencies) {
  return async function DELETE(request: Request): Promise<Response> {
    if (!isAllowedOrigin(request)) {
      return Response.json(
        { error: "FORBIDDEN_ORIGIN" },
        { status: 403, headers: RESPONSE_HEADERS },
      );
    }

    const requestId = dependencies.createRequestId();
    let identity: AuthIdentity | null;
    try {
      identity = await dependencies.getIdentity();
    } catch (reason) {
      dependencies.reportFailure(requestId, reason);
      return Response.json(
        { error: "ACCOUNT_DELETION_UNAVAILABLE" },
        { status: 503, headers: RESPONSE_HEADERS },
      );
    }
    if (!identity) {
      return Response.json(
        { error: "AUTH_REQUIRED" },
        { status: 401, headers: RESPONSE_HEADERS },
      );
    }

    try {
      const job = await dependencies.requestDeletion(identity.id, requestId);
      if (job.status === "completed") {
        return new Response(null, { status: 204, headers: RESPONSE_HEADERS });
      }

      return Response.json(
        {
          deletion: {
            requestId: job.id,
            status: job.status,
          },
        },
        { status: 202, headers: RESPONSE_HEADERS },
      );
    } catch (reason) {
      dependencies.reportFailure(requestId, reason);
      return Response.json(
        { deletion: { requestId, status: "retryable_failed" } },
        { status: 503, headers: RESPONSE_HEADERS },
      );
    }
  };
}
