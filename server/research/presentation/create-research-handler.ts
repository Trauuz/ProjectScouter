import { ZodError } from "zod";

import type { RateLimiter } from "../application/rate-limiter";
import { ResearchFailure } from "../application/research-errors";
import type { ResearchWorkflow } from "../application/research-ports";
import { ResearchPrompt } from "../domain/research-prompt";
import type { ResearchOwner } from "../domain/research-owner";
import type {
  ResearchApiErrorCode,
  ResearchErrorResponse,
} from "../domain/research-report";
import type { MonthlyUsageMeter } from "@/server/usage/monthly-usage";

const MAX_BODY_BYTES = 4_096;
const REQUEST_TIMEOUT_MS = 85_000;
const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

type Dependencies = {
  workflow: ResearchWorkflow;
  rateLimiter: RateLimiter;
  usageMeter?: Pick<MonthlyUsageMeter, "reserve">;
  diagnostics?: ResearchDiagnostics;
};

type ResearchDiagnostics = {
  exposeDetails: boolean;
  reportFailure: (reason: unknown) => void;
};

const DEFAULT_DIAGNOSTICS: ResearchDiagnostics = {
  exposeDetails: process.env.NODE_ENV !== "production",
  reportFailure: (reason) => console.error("[research-api] Request failed", reason),
};

function errorResponse(
  status: number,
  code: ResearchApiErrorCode,
  message: string,
  retryable: boolean,
  headers?: HeadersInit,
  details?: string,
): Response {
  const body: ResearchErrorResponse = {
    error: {
      code,
      message,
      retryable,
      ...(details ? { details } : {}),
    },
  };

  return Response.json(body, {
    status,
    headers: { ...RESPONSE_HEADERS, ...headers },
  });
}

function requestKey(request: Request): string {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .at(-1);

  return forwarded || request.headers.get("x-real-ip") || "local";
}

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

function diagnosticDetails(reason: unknown): string {
  const messages: string[] = [];
  const visited = new Set<unknown>();
  let current: unknown = reason;

  while (current && !visited.has(current)) {
    visited.add(current);

    if (!(current instanceof Error)) {
      messages.push(String(current));
      break;
    }

    messages.push(`${current.name}: ${current.message}`);
    current = Object.hasOwn(current, "cause")
      ? (current as Error & { cause?: unknown }).cause
      : undefined;
  }

  return messages.join(" Caused by: ").slice(0, 2_000);
}

function failureResponse(
  failure: ResearchFailure,
  diagnostics: ResearchDiagnostics,
): Response {
  const responses = {
    NO_EVIDENCE: [422, "No usable public evidence was found.", false],
    UPSTREAM_FAILED: [502, "A research provider could not complete the request.", true],
    UPSTREAM_TIMEOUT: [504, "Research took too long. Please try again.", true],
    SERVER_MISCONFIGURED: [500, "The research service is not configured.", false],
  } as const;
  const [status, message, retryable] = responses[failure.code];

  const details = diagnostics.exposeDetails
    ? diagnosticDetails(failure)
    : undefined;

  return errorResponse(status, failure.code, message, retryable, undefined, details);
}

async function readPrompt(request: Request): Promise<ResearchPrompt> {
  const declaredLength = Number(request.headers.get("content-length") || 0);

  if (declaredLength > MAX_BODY_BYTES) {
    throw new ResearchFailure("UPSTREAM_FAILED", "PAYLOAD_TOO_LARGE");
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new ResearchFailure("UPSTREAM_FAILED", "PAYLOAD_TOO_LARGE");
  }

  const body = JSON.parse(text) as { prompt?: unknown };
  return ResearchPrompt.create(body.prompt);
}

export function createResearchPostHandler({
  workflow,
  rateLimiter,
  usageMeter,
  diagnostics = DEFAULT_DIAGNOSTICS,
}: Dependencies) {
  return async function POST(
    request: Request,
    owner: ResearchOwner,
  ): Promise<Response> {
    const mediaType = request.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();

    if (mediaType !== "application/json") {
      return errorResponse(
        415,
        "INVALID_CONTENT_TYPE",
        "Send the request as application/json.",
        false,
      );
    }

    if (!isAllowedOrigin(request)) {
      return errorResponse(
        403,
        "FORBIDDEN_ORIGIN",
        "Cross-origin research requests are not allowed.",
        false,
      );
    }

    const limit = rateLimiter.check(requestKey(request));
    if (!limit.allowed) {
      return errorResponse(
        429,
        "RATE_LIMITED",
        "Too many research requests. Please wait before trying again.",
        true,
        { "Retry-After": String(limit.retryAfterSeconds) },
      );
    }

    try {
      const prompt = await readPrompt(request);
      if (owner.userId && usageMeter) {
        let reservation;
        try {
          reservation = await usageMeter.reserve(owner.userId);
        } catch (reason) {
          diagnostics.reportFailure(reason);
          return errorResponse(
            503,
            "USAGE_UNAVAILABLE",
            "Usage could not be verified. Please try again.",
            true,
          );
        }
        if (!reservation.allowed) {
          if (reservation.denialReason === "google-ai") {
            return errorResponse(
              429,
              "FREE_TIER_CAPACITY_REACHED",
              "ProjectScout has reached today’s AI free-tier capacity. Please try again tomorrow.",
              true,
            );
          }
          if (reservation.denialReason === "tavily") {
            return errorResponse(
              429,
              "FREE_TIER_CAPACITY_REACHED",
              "ProjectScout has reached this month’s search free-tier capacity.",
              false,
            );
          }
          return errorResponse(
            429,
            "MONTHLY_USAGE_EXCEEDED",
            `You have used all ${reservation.usage.limit} research credits for this month.`,
            false,
          );
        }
      }
      const signal = AbortSignal.any([
        request.signal,
        AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ]);
      const result = await workflow.execute(prompt, owner, signal);

      return Response.json(result, { headers: RESPONSE_HEADERS });
    } catch (reason) {
      if (
        reason instanceof ResearchFailure &&
        reason.message === "PAYLOAD_TOO_LARGE"
      ) {
        return errorResponse(
          413,
          "PAYLOAD_TOO_LARGE",
          "The request body is too large.",
          false,
        );
      }

      if (reason instanceof ZodError || reason instanceof SyntaxError) {
        return errorResponse(
          400,
          "INVALID_PROMPT",
          "Enter a project topic between 10 and 500 characters.",
          false,
        );
      }

      if (reason instanceof ResearchFailure) {
        diagnostics.reportFailure(reason);
        return failureResponse(reason, diagnostics);
      }

      if (reason instanceof DOMException && reason.name === "AbortError") {
        diagnostics.reportFailure(reason);
        return errorResponse(
          504,
          "UPSTREAM_TIMEOUT",
          "Research took too long. Please try again.",
          true,
        );
      }

      diagnostics.reportFailure(reason);
      return errorResponse(
        502,
        "UPSTREAM_FAILED",
        "A research provider could not complete the request.",
        true,
        undefined,
        diagnostics.exposeDetails ? diagnosticDetails(reason) : undefined,
      );
    }
  };
}
