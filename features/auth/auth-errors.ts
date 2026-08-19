export type AuthFailureKind =
  | "configuration"
  | "credentials"
  | "unverified"
  | "rate_limited"
  | "weak_password"
  | "unavailable"
  | "unknown";

export type AuthFailure = {
  kind: AuthFailureKind;
  message: string;
};

export function toAuthFailure(reason: unknown): AuthFailure {
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
  if (message.includes("invalid login credentials")) {
    return {
      kind: "credentials",
      message:
        "The email address or password did not match. Check both fields and try again.",
    };
  }
  if (message.includes("email not confirmed")) {
    return {
      kind: "unverified",
      message: "Confirm your email address before logging in.",
    };
  }
  if (message.includes("rate") || message.includes("too many")) {
    return {
      kind: "rate_limited",
      message:
        "Too many authentication attempts were made. Wait a moment, then try again.",
    };
  }
  if (message.includes("weak password")) {
    return {
      kind: "weak_password",
      message: "Use at least 8 characters with a letter, number, and symbol.",
    };
  }
  if (
    message.includes("failed to fetch") ||
    message.includes("network request failed") ||
    message.includes("authretryablefetcherror") ||
    message.includes("fetch failed")
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

