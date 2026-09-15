import "server-only";

import {
  logger as defaultLogger,
  StructuredLogger,
  withObservabilityContext,
} from "./structured-logger";

type RouteHandler<Arguments extends unknown[]> = (
  request: Request,
  ...argumentsList: Arguments
) => Response | Promise<Response>;

function requestId(request: Request): string {
  const supplied = request.headers.get("x-correlation-id")?.trim();
  if (supplied && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(supplied)) {
    return supplied.toLowerCase();
  }
  return crypto.randomUUID();
}

export function observeRoute<Arguments extends unknown[]>(
  route: string,
  handler: RouteHandler<Arguments>,
  logger: StructuredLogger = defaultLogger,
): RouteHandler<Arguments> {
  return async (request, ...argumentsList) => {
    const correlationId = requestId(request);
    return withObservabilityContext({ requestId: correlationId, route }, async () => {
      const startedAt = Date.now();
      logger.metric("api.request.count", { value: 1 });
      let response: Response;
      try {
        response = await handler(request, ...argumentsList);
      } catch (reason) {
        logger.error("api.request.failed", {
          operation: `${request.method} ${route}`,
          errorCategory: "unhandled",
          retryStatus: "retryable",
        }, reason);
        response = Response.json(
          {
            error: {
              code: "INTERNAL_ERROR",
              message: "The request could not be completed. Please try again.",
              retryable: true,
            },
          },
          { status: 500 },
        );
      }
      const durationMs = Date.now() - startedAt;
      logger.metric("api.request.latency_ms", {
        durationMs,
        statusCode: response.status,
      });
      response.headers.set("X-Correlation-ID", correlationId);
      return response;
    });
  };
}
