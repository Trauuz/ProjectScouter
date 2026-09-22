import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  DeploymentConfigurationError,
  validateProductionEnvironment,
} from "./production-environment";

const serviceRoleKey = [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url"),
  "test-signature",
].join(".");

function validEnvironment(): Record<string, string> {
  return {
    DATABASE_URL: "postgresql://user:password@db.test/projectscout",
    DATABASE_CONNECTION_MODE: "transaction_pooler",
    DATABASE_RUNTIME: "serverless",
    DATABASE_POOL_MAX: "4",
    DATABASE_CONNECT_TIMEOUT_SECONDS: "10",
    DATABASE_IDLE_TIMEOUT_SECONDS: "20",
    DATABASE_MAX_LIFETIME_SECONDS: "1800",
    DATABASE_SHUTDOWN_TIMEOUT_SECONDS: "5",
    DATABASE_CONNECTION_BUDGET: "60",
    DATABASE_MAX_APP_INSTANCES: "10",
    DATABASE_RESERVED_CONNECTIONS: "10",
    DATABASE_SSL_MODE: "require",
    NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-key",
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    ACCOUNT_DELETION_WORKER_SECRET: "a-test-worker-secret-with-at-least-32-characters",
    RESEARCH_PROVIDER: "tavily",
    RESEARCH_API_KEY: "test-research-key",
    RESEARCH_PROVIDER_MODE: "advanced",
    RECOMMENDATION_PROVIDER: "gemini",
    RECOMMENDATION_API_KEY: "test-recommendation-key",
    RECOMMENDATION_MODEL: "gemini-test-model",
    ACCOUNT_MONTHLY_RESEARCH_LIMIT: "5",
    RESEARCH_PROVIDER_MONTHLY_CREDIT_CEILING: "900",
    RESEARCH_PROVIDER_CREDITS_PER_CALL: "2",
    RECOMMENDATION_PROVIDER_DAILY_CALL_CEILING: "10",
    PROVIDER_USAGE_WARNING_PERCENT: "80",
    PROVIDER_DAILY_SPEND_CEILING_MICRODOLLARS: "500000",
    PROVIDER_MONTHLY_SPEND_CEILING_MICRODOLLARS: "10000000",
    RESEARCH_PROVIDER_REQUEST_MICRODOLLARS: "0",
    RESEARCH_PROVIDER_INPUT_MICRODOLLARS_PER_MILLION_TOKENS: "0",
    RESEARCH_PROVIDER_OUTPUT_MICRODOLLARS_PER_MILLION_TOKENS: "0",
    RESEARCH_PROVIDER_MICRODOLLARS_PER_CREDIT: "8000",
    RECOMMENDATION_PROVIDER_REQUEST_MICRODOLLARS: "0",
    RECOMMENDATION_PROVIDER_INPUT_MICRODOLLARS_PER_MILLION_TOKENS: "2000000",
    RECOMMENDATION_PROVIDER_OUTPUT_MICRODOLLARS_PER_MILLION_TOKENS: "8000000",
    RECOMMENDATION_PROVIDER_MICRODOLLARS_PER_CREDIT: "0",
  };
}

describe("validateProductionEnvironment", () => {
  it("accepts complete production configuration without returning secret values", () => {
    expect(validateProductionEnvironment(validEnvironment())).toEqual({
      valid: true,
      checkedVariables: expect.arrayContaining([
        "SUPABASE_SERVICE_ROLE_KEY",
        "ACCOUNT_DELETION_WORKER_SECRET",
      ]),
    });
  });

  it("fails early with variable names only when required configuration is missing", () => {
    const source = validEnvironment();
    delete source.SUPABASE_SERVICE_ROLE_KEY;
    delete source.ACCOUNT_DELETION_WORKER_SECRET;

    expect(() => validateProductionEnvironment(source)).toThrowError(
      DeploymentConfigurationError,
    );

    try {
      validateProductionEnvironment(source);
    } catch (reason) {
      expect(reason).toMatchObject({
        code: "PRODUCTION_CONFIGURATION_INVALID",
        variableNames: expect.arrayContaining([
          "SUPABASE_SERVICE_ROLE_KEY",
          "ACCOUNT_DELETION_WORKER_SECRET",
        ]),
      });
      expect(JSON.stringify(reason)).not.toContain(serviceRoleKey);
    }
  });

  it("fails deployment validation when aggregate application pools exceed the budget", () => {
    const source = validEnvironment();
    source.DATABASE_POOL_MAX = "6";

    expect(() => validateProductionEnvironment(source)).toThrowError(
      DeploymentConfigurationError,
    );
  });
});
