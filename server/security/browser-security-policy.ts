export type BrowserSecurityEnvironment = "development" | "production" | "test";

export type BrowserSecurityPolicy = Readonly<{
  contentSecurityPolicy: string;
  strictTransportSecurity?: string;
}>;

type BrowserSecurityPolicyOptions = Readonly<{
  nonce: string;
  supabaseUrl?: string | null;
  environment: BrowserSecurityEnvironment;
}>;

const NONCE = /^[A-Za-z0-9+/_=-]+$/;

function externalConnectionOrigins(supabaseUrl?: string | null): string[] {
  if (!supabaseUrl) {
    return [];
  }
  return [new URL(supabaseUrl).origin];
}

function directive(name: string, sources: readonly string[]): string {
  return `${name} ${sources.join(" ")}`;
}

export function createBrowserSecurityPolicy({
  nonce,
  supabaseUrl,
  environment,
}: BrowserSecurityPolicyOptions): BrowserSecurityPolicy {
  if (!NONCE.test(nonce)) {
    throw new Error("INVALID_CSP_NONCE");
  }

  const isDevelopment = environment === "development";
  const directives = [
    directive("default-src", ["'self'"]),
    directive("script-src", [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ]),
    directive("script-src-attr", ["'none'"]),
    directive("style-src", [
      "'self'",
      ...(isDevelopment ? ["'unsafe-inline'"] : [`'nonce-${nonce}'`]),
    ]),
    directive("style-src-attr", ["'none'"]),
    directive("img-src", ["'self'", "blob:", "data:"]),
    directive("font-src", ["'self'"]),
    directive("connect-src", [
      "'self'",
      ...externalConnectionOrigins(supabaseUrl),
    ]),
    directive("media-src", ["'self'"]),
    directive("worker-src", ["'self'", "blob:"]),
    directive("manifest-src", ["'self'"]),
    directive("object-src", ["'none'"]),
    directive("base-uri", ["'self'"]),
    directive("form-action", ["'self'"]),
    directive("frame-src", ["'none'"]),
    directive("frame-ancestors", ["'none'"]),
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ];

  return {
    contentSecurityPolicy: `${directives.join("; ")};`,
    ...(environment === "production"
      ? { strictTransportSecurity: "max-age=63072000; includeSubDomains; preload" }
      : {}),
  };
}

export function applyBrowserSecurityHeaders(
  headers: Headers,
  policy: BrowserSecurityPolicy,
): void {
  headers.set("Content-Security-Policy", policy.contentSecurityPolicy);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  if (policy.strictTransportSecurity) {
    headers.set("Strict-Transport-Security", policy.strictTransportSecurity);
  }
}
