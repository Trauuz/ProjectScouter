import type { VisitorSessionId } from "../../../../server/research/domain/research-owner";

type ClaimRunsDependencies = {
  getIdentity: () => Promise<{ id: string } | null>;
  getVisitorSession: () => Promise<VisitorSessionId>;
  attachResearchRuns: (
    sessionId: VisitorSessionId,
    userId: string,
  ) => Promise<number>;
  rotateVisitorSession: () => Promise<void>;
  reportFailure: (reason: unknown) => void;
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

export function createClaimRunsPostHandler(dependencies: ClaimRunsDependencies) {
  return async function POST(request: Request): Promise<Response> {
    if (!isAllowedOrigin(request)) {
      return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
    }

    const identity = await dependencies.getIdentity();
    if (!identity) {
      return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }

    try {
      const sessionId = await dependencies.getVisitorSession();
      const attached = await dependencies.attachResearchRuns(
        sessionId,
        identity.id,
      );
      await dependencies.rotateVisitorSession();
      return Response.json(
        { attached },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (reason) {
      dependencies.reportFailure(reason);
      return Response.json({ error: "CLAIM_FAILED" }, { status: 503 });
    }
  };
}
