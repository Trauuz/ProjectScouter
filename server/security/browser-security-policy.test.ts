import { describe, expect, it } from "vitest";

import {
  applyBrowserSecurityHeaders,
  createBrowserSecurityPolicy,
} from "./browser-security-policy";

const SUPABASE_URL = "https://project-ref.supabase.co";

describe("browser security policy", () => {
  it("adds the production browser security headers", () => {
    const headers = new Headers();
    const policy = createBrowserSecurityPolicy({
      nonce: "unique-request-nonce",
      supabaseUrl: SUPABASE_URL,
      environment: "production",
    });

    applyBrowserSecurityHeaders(headers, policy);

    expect(Object.fromEntries(headers)).toMatchObject({
      "content-security-policy": expect.stringContaining(
        "script-src 'self' 'nonce-unique-request-nonce' 'strict-dynamic'",
      ),
      "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
      "x-content-type-options": "nosniff",
      "cross-origin-opener-policy": "same-origin",
      "cross-origin-resource-policy": "same-origin",
    });
    expect(headers.get("content-security-policy")).toContain(
      `connect-src 'self' ${SUPABASE_URL}`,
    );
    expect(headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers.get("content-security-policy")).not.toContain("* ");
    expect(headers.get("content-security-policy")).not.toContain("'unsafe-inline'");
    expect(headers.get("content-security-policy")).not.toContain("'unsafe-eval'");
  });

  it("keeps local development compatible without sending HSTS", () => {
    const headers = new Headers();
    const policy = createBrowserSecurityPolicy({
      nonce: "development-nonce",
      supabaseUrl: SUPABASE_URL,
      environment: "development",
    });

    applyBrowserSecurityHeaders(headers, policy);

    expect(headers.has("strict-transport-security")).toBe(false);
    expect(headers.get("content-security-policy")).toContain("'unsafe-eval'");
    expect(headers.get("content-security-policy")).toContain("'unsafe-inline'");
    expect(headers.get("content-security-policy")).not.toContain(
      "upgrade-insecure-requests",
    );
  });

  it("uses only the Supabase origin and never its path or credentials", () => {
    const policy = createBrowserSecurityPolicy({
      nonce: "request-nonce",
      supabaseUrl: "https://project-ref.supabase.co/auth/v1?token=secret",
      environment: "production",
    });

    expect(policy.contentSecurityPolicy).toContain(
      "connect-src 'self' https://project-ref.supabase.co",
    );
    expect(policy.contentSecurityPolicy).not.toContain("/auth/v1");
    expect(policy.contentSecurityPolicy).not.toContain("secret");
  });
});
