import { describe, expect, it } from "vitest";

import {
  DatabaseConfigurationError,
  readDatabaseEnvironment,
} from "./database-environment";

const DATABASE_URL =
  "postgresql://postgres.project:password@aws-0-region.pooler.supabase.com:6543/postgres";

describe("readDatabaseEnvironment", () => {
  it("uses bounded serverless defaults with more than one connection", () => {
    expect(readDatabaseEnvironment({ DATABASE_URL })).toMatchObject({
      connectionMode: "transaction_pooler",
      runtime: "serverless",
      poolMax: 4,
      connectTimeoutSeconds: 10,
      idleTimeoutSeconds: 20,
      maxLifetimeSeconds: 1_800,
      shutdownTimeoutSeconds: 5,
      connectionBudget: 60,
      maxApplicationInstances: 10,
      reservedConnections: 10,
      sslMode: "require",
    });
  });

  it("accepts explicit pool and timeout configuration within the budget", () => {
    expect(readDatabaseEnvironment({
      DATABASE_URL,
      DATABASE_POOL_MAX: "6",
      DATABASE_CONNECT_TIMEOUT_SECONDS: "7",
      DATABASE_IDLE_TIMEOUT_SECONDS: "30",
      DATABASE_MAX_LIFETIME_SECONDS: "900",
      DATABASE_SHUTDOWN_TIMEOUT_SECONDS: "8",
      DATABASE_CONNECTION_BUDGET: "90",
      DATABASE_MAX_APP_INSTANCES: "10",
      DATABASE_RESERVED_CONNECTIONS: "20",
    })).toMatchObject({
      poolMax: 6,
      connectTimeoutSeconds: 7,
      idleTimeoutSeconds: 30,
      maxLifetimeSeconds: 900,
      shutdownTimeoutSeconds: 8,
    });
  });

  it("rejects a configuration whose aggregate pools exceed the budget", () => {
    expect(() => readDatabaseEnvironment({
      DATABASE_URL,
      DATABASE_POOL_MAX: "6",
      DATABASE_CONNECTION_BUDGET: "60",
      DATABASE_MAX_APP_INSTANCES: "10",
      DATABASE_RESERVED_CONNECTIONS: "10",
    })).toThrowError(DatabaseConfigurationError);
  });

  it("requires transaction pooling for the serverless runtime", () => {
    expect(() => readDatabaseEnvironment({
      DATABASE_URL: "postgresql://postgres:password@db.project.supabase.co:5432/postgres",
      DATABASE_CONNECTION_MODE: "direct",
      DATABASE_RUNTIME: "serverless",
    })).toThrowError(DatabaseConfigurationError);
  });

  it("requires the Supabase transaction-pooler port when that endpoint is selected", () => {
    expect(() => readDatabaseEnvironment({
      DATABASE_URL:
        "postgresql://postgres.project:password@aws-0-region.pooler.supabase.com:5432/postgres",
    })).toThrowError(DatabaseConfigurationError);
  });

  it("rejects a direct Supabase endpoint labeled as a transaction pooler", () => {
    expect(() => readDatabaseEnvironment({
      DATABASE_URL:
        "postgresql://postgres:password@db.project.supabase.co:5432/postgres",
    })).toThrowError(DatabaseConfigurationError);
  });
});
