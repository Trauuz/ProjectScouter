import { z } from "zod";

import {
  logger as defaultLogger,
  setObservedUser,
  type StructuredLogger,
} from "../../../server/observability/structured-logger";

type AuthIdentity = Readonly<{ id: string }>;

type UsageHandlerDependencies = Readonly<{
  getIdentity(): Promise<AuthIdentity | null>;
  readUsage(userId: string): Promise<unknown>;
  logger?: StructuredLogger;
}>;

const monthlyUsageSchema = z.object({
  limit: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  resetsAt: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
}).strict().refine(
  ({ limit, used, remaining }) => remaining === Math.max(0, limit - used),
  { message: "Usage totals are inconsistent." },
);

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function errorCode(reason: unknown): string | undefined {
  if (!reason || typeof reason !== "object") {
    return undefined;
  }
  const code = Reflect.get(reason, "code");
  return typeof code === "string" ? code : undefined;
}

function failureCategory(reason: unknown): string {
  if (reason instanceof z.ZodError) {
    return "malformed_database_result";
  }
  if (
    (reason instanceof Error && reason.name === "TimeoutError") ||
    ["ETIMEDOUT", "57014"].includes(errorCode(reason) ?? "")
  ) {
    return "database_timeout";
  }
  return "internal_error";
}

function unavailableResponse(): Response {
  return Response.json(
    {
      error: {
        code: "USAGE_UNAVAILABLE",
        message: "Usage is temporarily unavailable. Please try again.",
        retryable: true,
      },
    },
    { status: 503, headers: RESPONSE_HEADERS },
  );
}

export function createUsageHandler({
  getIdentity,
  readUsage,
  logger = defaultLogger,
}: UsageHandlerDependencies) {
  return async (request: Request): Promise<Response> => {
    void request;
    try {
      const identity = await getIdentity();
      if (!identity) {
        return Response.json(
          { error: "Authentication required." },
          { status: 401, headers: RESPONSE_HEADERS },
        );
      }

      setObservedUser(identity.id);
      const usage = monthlyUsageSchema.parse(await readUsage(identity.id));
      return Response.json(usage, { headers: RESPONSE_HEADERS });
    } catch (reason) {
      logger.error("usage.read.failed", {
        operation: "read_monthly_usage",
        errorCategory: failureCategory(reason),
        retryStatus: "retryable",
        persistenceStatus: "not_applicable",
      }, reason);
      return unavailableResponse();
    }
  };
}
