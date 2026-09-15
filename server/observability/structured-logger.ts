import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";

export type ObservabilityContext = {
  requestId: string;
  route: string;
  userHash?: string;
};

export type LogFields = Readonly<Record<string, unknown>>;
type LogLevel = "info" | "warn" | "error";
type LogSink = (serializedEvent: string) => void;

const contextStorage = new AsyncLocalStorage<ObservabilityContext>();
const SENSITIVE_KEY =
  /authorization|password|passphrase|token|secret|api.?key|cookie|prompt|request.?body|response.?body|provider.?response|database.?url/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BEARER = /Bearer\s+[^\s]+/gi;
const DATABASE_URL = /postgres(?:ql)?:\/\/[^\s]+/gi;
const SECRET_PREFIX = /\b(?:sk|sb_secret)_[A-Za-z0-9_-]+\b/g;
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

export function safeUserHash(userId: string): string {
  return createHash("sha256")
    .update(`projectscout-user:${userId}`)
    .digest("hex")
    .slice(0, 24);
}

function redactString(value: string): string {
  return value
    .replace(BEARER, "[REDACTED]")
    .replace(DATABASE_URL, "[REDACTED]")
    .replace(SECRET_PREFIX, "[REDACTED]")
    .replace(JWT, "[REDACTED]")
    .replace(EMAIL, "[REDACTED_EMAIL]");
}

function sanitizeValue(key: string, value: unknown): unknown {
  if (key === "userId" && typeof value === "string") {
    return safeUserHash(value);
  }
  if (SENSITIVE_KEY.test(key)) {
    return "[REDACTED]";
  }
  if (typeof value === "string") {
    return redactString(value).slice(0, 500);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue("item", item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 50)
        .map(([nestedKey, nestedValue]) => [
          nestedKey,
          sanitizeValue(nestedKey, nestedValue),
        ]),
    );
  }
  return value;
}

function sanitizedFields(fields: LogFields): Record<string, unknown> {
  const sanitized = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, sanitizeValue(key, value)]),
  );
  if (Object.hasOwn(sanitized, "userId")) {
    sanitized.userHash = sanitized.userId;
    delete sanitized.userId;
  }
  return sanitized;
}

function defaultSink(line: string): void {
  process.stderr.write(`${line}\n`);
}

export class StructuredLogger {
  constructor(private readonly sink: LogSink = defaultSink) {}

  info(event: string, fields: LogFields = {}): void {
    this.write("info", event, fields);
  }

  warn(event: string, fields: LogFields = {}): void {
    this.write("warn", event, fields);
  }

  error(event: string, fields: LogFields, reason?: unknown): void {
    this.write("error", event, {
      ...fields,
      ...(reason === undefined ? {} : {
        errorType: reason instanceof Error ? reason.name : "UnknownError",
      }),
    });
  }

  metric(metric: string, fields: LogFields = {}): void {
    this.write("info", "metric", { metric, ...fields });
  }

  private write(level: LogLevel, event: string, fields: LogFields): void {
    const context = contextStorage.getStore();
    this.sink(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      requestId: context?.requestId ?? "system",
      route: context?.route ?? "background",
      ...(context?.userHash ? { userHash: context.userHash } : {}),
      ...sanitizedFields(fields),
    }));
  }
}

export const logger = new StructuredLogger();

export function withObservabilityContext<T>(
  context: ObservabilityContext,
  work: () => T,
): T {
  return contextStorage.run(context, work);
}

export function setObservedUser(userId: string): void {
  const context = contextStorage.getStore();
  if (context) {
    context.userHash = safeUserHash(userId);
  }
}
