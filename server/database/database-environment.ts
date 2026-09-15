import { z } from "zod";

const variableNames = [
  "DATABASE_URL",
  "DATABASE_CONNECTION_MODE",
  "DATABASE_RUNTIME",
  "DATABASE_POOL_MAX",
  "DATABASE_CONNECT_TIMEOUT_SECONDS",
  "DATABASE_IDLE_TIMEOUT_SECONDS",
  "DATABASE_MAX_LIFETIME_SECONDS",
  "DATABASE_SHUTDOWN_TIMEOUT_SECONDS",
  "DATABASE_CONNECTION_BUDGET",
  "DATABASE_MAX_APP_INSTANCES",
  "DATABASE_RESERVED_CONNECTIONS",
  "DATABASE_SSL_MODE",
] as const;

export type DatabaseVariableName = (typeof variableNames)[number];

const postgresUrl = z
  .string({ error: "DATABASE_URL is required." })
  .trim()
  .url("DATABASE_URL must be a valid URL.")
  .refine(
    (value) => ["postgres:", "postgresql:"].includes(new URL(value).protocol),
    "DATABASE_URL must use the postgres protocol.",
  );

const integer = (minimum: number, maximum: number, fallback: number) =>
  z.coerce.number().int().min(minimum).max(maximum).default(fallback);

const databaseEnvironmentSchema = z
  .object({
    DATABASE_URL: postgresUrl,
    DATABASE_CONNECTION_MODE: z
      .enum(["transaction_pooler", "session_pooler", "direct"])
      .default("transaction_pooler"),
    DATABASE_RUNTIME: z.enum(["serverless", "long_lived"]).default("serverless"),
    DATABASE_POOL_MAX: integer(2, 20, 4),
    DATABASE_CONNECT_TIMEOUT_SECONDS: integer(1, 60, 10),
    DATABASE_IDLE_TIMEOUT_SECONDS: integer(1, 300, 20),
    DATABASE_MAX_LIFETIME_SECONDS: integer(60, 3_600, 1_800),
    DATABASE_SHUTDOWN_TIMEOUT_SECONDS: integer(1, 30, 5),
    DATABASE_CONNECTION_BUDGET: integer(10, 500, 60),
    DATABASE_MAX_APP_INSTANCES: integer(1, 1_000, 10),
    DATABASE_RESERVED_CONNECTIONS: integer(1, 499, 10),
    DATABASE_SSL_MODE: z.enum(["require", "disable"]).default("require"),
  })
  .superRefine((environment, context) => {
    if (
      environment.DATABASE_RUNTIME === "serverless" &&
      environment.DATABASE_CONNECTION_MODE !== "transaction_pooler"
    ) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_CONNECTION_MODE"],
        message: "Serverless deployments must use transaction pooling.",
      });
    }

    const url = new URL(environment.DATABASE_URL);
    const isSupabaseEndpoint =
      url.hostname.endsWith("supabase.co") ||
      url.hostname.endsWith("supabase.com");
    const isSharedPooler = url.hostname.endsWith("pooler.supabase.com");
    if (
      environment.DATABASE_CONNECTION_MODE === "transaction_pooler" &&
      isSupabaseEndpoint &&
      (!url.port || url.port !== "6543" ||
        (!isSharedPooler && !url.hostname.startsWith("db.")))
    ) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "Supabase transaction pooler connections must use port 6543.",
      });
    }
    if (
      environment.DATABASE_CONNECTION_MODE === "session_pooler" &&
      isSupabaseEndpoint &&
      (!isSharedPooler || url.port !== "5432")
    ) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "Supabase session pooler connections must use its pooler host on port 5432.",
      });
    }
    if (
      environment.DATABASE_CONNECTION_MODE === "direct" &&
      isSupabaseEndpoint &&
      (!url.hostname.startsWith("db.") || url.port !== "5432")
    ) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "Supabase direct connections must use its database host on port 5432.",
      });
    }
    if (
      isSupabaseEndpoint &&
      environment.DATABASE_SSL_MODE !== "require"
    ) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_SSL_MODE"],
        message: "Supabase database connections must require TLS.",
      });
    }

    const applicationConnectionLimit =
      environment.DATABASE_POOL_MAX * environment.DATABASE_MAX_APP_INSTANCES;
    const applicationConnectionBudget =
      environment.DATABASE_CONNECTION_BUDGET -
      environment.DATABASE_RESERVED_CONNECTIONS;
    if (applicationConnectionLimit > applicationConnectionBudget) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_POOL_MAX"],
        message:
          "Aggregate application pools exceed the database connection budget.",
      });
    }
  });

export type DatabaseEnvironment = Readonly<{
  databaseUrl: string;
  connectionMode: "transaction_pooler" | "session_pooler" | "direct";
  runtime: "serverless" | "long_lived";
  poolMax: number;
  connectTimeoutSeconds: number;
  idleTimeoutSeconds: number;
  maxLifetimeSeconds: number;
  shutdownTimeoutSeconds: number;
  connectionBudget: number;
  maxApplicationInstances: number;
  reservedConnections: number;
  sslMode: "require" | "disable";
}>;

export class DatabaseConfigurationError extends Error {
  readonly code = "DATABASE_CONFIGURATION_INVALID";

  constructor(
    readonly variableNames: readonly DatabaseVariableName[],
    cause: z.ZodError,
  ) {
    super(`Database configuration is missing or invalid: ${variableNames.join(", ")}.`, {
      cause,
    });
    this.name = "DatabaseConfigurationError";
  }
}

export function readDatabaseEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
): DatabaseEnvironment {
  const result = databaseEnvironmentSchema.safeParse(source);

  if (!result.success) {
    const invalid = new Set(
      result.error.issues
        .map((issue) => issue.path[0])
        .filter((name): name is DatabaseVariableName =>
          variableNames.includes(name as DatabaseVariableName),
        ),
    );
    throw new DatabaseConfigurationError(
      variableNames.filter((name) => invalid.has(name)),
      result.error,
    );
  }

  const environment = result.data;
  return {
    databaseUrl: environment.DATABASE_URL,
    connectionMode: environment.DATABASE_CONNECTION_MODE,
    runtime: environment.DATABASE_RUNTIME,
    poolMax: environment.DATABASE_POOL_MAX,
    connectTimeoutSeconds: environment.DATABASE_CONNECT_TIMEOUT_SECONDS,
    idleTimeoutSeconds: environment.DATABASE_IDLE_TIMEOUT_SECONDS,
    maxLifetimeSeconds: environment.DATABASE_MAX_LIFETIME_SECONDS,
    shutdownTimeoutSeconds: environment.DATABASE_SHUTDOWN_TIMEOUT_SECONDS,
    connectionBudget: environment.DATABASE_CONNECTION_BUDGET,
    maxApplicationInstances: environment.DATABASE_MAX_APP_INSTANCES,
    reservedConnections: environment.DATABASE_RESERVED_CONNECTIONS,
    sslMode: environment.DATABASE_SSL_MODE,
  };
}
