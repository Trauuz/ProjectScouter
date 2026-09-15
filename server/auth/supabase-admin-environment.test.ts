import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  AccountDeletionConfigurationError,
  readSupabaseAdminEnvironment,
} from "./supabase-admin-environment";

function serviceRoleJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .toString("base64url");
  const payload = Buffer.from(JSON.stringify({ role: "service_role" }))
    .toString("base64url");
  return `${header}.${payload}.test-signature`;
}

describe("readSupabaseAdminEnvironment", () => {
  it("returns typed server-only configuration for a service-role JWT", () => {
    const environment = readSupabaseAdminEnvironment({
      NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleJwt(),
    });

    expect(environment.url).toBe("https://project-ref.supabase.co");
    expect(environment.serviceRoleKey).toBe(serviceRoleJwt());
  });

  it("reports a controlled operational error when the service-role key is missing", () => {
    expect(() =>
      readSupabaseAdminEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
      }),
    ).toThrowError(AccountDeletionConfigurationError);

    try {
      readSupabaseAdminEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
      });
    } catch (reason) {
      expect(reason).toMatchObject({
        code: "ACCOUNT_DELETION_CONFIGURATION_INVALID",
        variableNames: ["SUPABASE_SERVICE_ROLE_KEY"],
      });
      expect(String(reason)).toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(String(reason)).not.toContain("undefined");
    }
  });

  it("rejects a publishable key without including it in the error", () => {
    const publishableKey = "sb_publishable_this-must-never-be-an-admin-key";

    expect(() =>
      readSupabaseAdminEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: publishableKey,
      }),
    ).toThrow("SUPABASE_SERVICE_ROLE_KEY is missing or invalid");

    try {
      readSupabaseAdminEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: publishableKey,
      });
    } catch (reason) {
      expect(JSON.stringify(reason)).not.toContain(publishableKey);
      expect(String(reason)).not.toContain(publishableKey);
    }
  });
});
