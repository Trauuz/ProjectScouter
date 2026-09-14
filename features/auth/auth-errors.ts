import { isAuthError } from "@supabase/supabase-js";

export type AuthFailureKind =
  | "configuration"
  | "credentials"
  | "rate_limited"
  | "weak_password"
  | "unavailable"
  | "unknown";

export type AuthFailure = {
  kind: AuthFailureKind;
  message: string;
};

export function authErrorCode(reason: unknown): string | undefined {
  return isAuthError(reason) ? reason.code : undefined;
}

export function toAuthFailure(reason: unknown): AuthFailure {
  const code = authErrorCode(reason);
  const rawMessage = reason instanceof Error ? reason.message : String(reason);
  const message = rawMessage.toLowerCase();

  if (
    message.includes("supabase_auth_not_configured") ||
    message.includes("authentication is not configured")
  ) {
    return {
      kind: "configuration",
      message:
        "Authentication is not configured. Add the Supabase project URL and publishable key, then restart ProjectScout.",
    };
  }
  if (
    code === "invalid_credentials" ||
    code === "email_not_confirmed" ||
    code === "user_not_found" ||
    message.includes("invalid login credentials") ||
    message.includes("email not confirmed")
  ) {
    return {
      kind: "credentials",
      message:
        "Login could not be completed. Check your email and password, or request a password reset.",
    };
  }
  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    message.includes("rate") ||
    message.includes("too many")
  ) {
    return {
      kind: "rate_limited",
      message:
        "Too many authentication attempts were made. Wait a moment, then try again.",
    };
  }
  if (code === "weak_password" || message.includes("weak password")) {
    return {
      kind: "weak_password",
      message: "Use at least 8 characters with a letter, number, and symbol.",
    };
  }
  if (
    message.includes("failed to fetch") ||
    message.includes("network request failed") ||
    message.includes("authretryablefetcherror") ||
    message.includes("fetch failed") ||
    code === "request_timeout"
  ) {
    return {
      kind: "unavailable",
      message:
        "The authentication service is unavailable. Try again shortly; your research prompt is still saved.",
    };
  }
  return {
    kind: "unknown",
    message:
      "Login could not be completed. Try again, or inspect the authentication response in development logs.",
  };
}

export function reportAuthFailure(action: string, reason: unknown): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const failure = toAuthFailure(reason);
  const details = reason instanceof Error
    ? { name: reason.name, message: reason.message }
    : { message: String(reason) };
  console.error(`[auth:${action}] ${failure.kind}`, details);
}
