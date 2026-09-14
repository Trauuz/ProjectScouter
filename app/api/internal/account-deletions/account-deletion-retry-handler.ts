import { timingSafeEqual } from "node:crypto";

import type { AccountDeletionRetrySummary } from "@/server/auth/account-deletion-retry";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

type Dependencies = {
  expectedSecret: string | undefined;
  retry(): Promise<AccountDeletionRetrySummary>;
  reportFailure(reason: unknown): void;
};

function authorized(request: Request, expectedSecret: string | undefined): boolean {
  const authorization = request.headers.get("authorization");
  if (!expectedSecret || !authorization?.startsWith("Bearer ")) {
    return false;
  }

  const supplied = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(expectedSecret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function createAccountDeletionRetryHandler(dependencies: Dependencies) {
  return async function POST(request: Request): Promise<Response> {
    if (!authorized(request, dependencies.expectedSecret)) {
      return Response.json(
        { error: "AUTH_REQUIRED" },
        { status: 401, headers: RESPONSE_HEADERS },
      );
    }

    try {
      const summary = await dependencies.retry();
      return Response.json(summary, { headers: RESPONSE_HEADERS });
    } catch (reason) {
      dependencies.reportFailure(reason);
      return Response.json(
        { error: "DELETION_RETRY_UNAVAILABLE" },
        { status: 503, headers: RESPONSE_HEADERS },
      );
    }
  };
}
