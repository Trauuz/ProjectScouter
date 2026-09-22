import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { readDatabaseEnvironment } from "./database-environment";
import {
  DatabaseTelemetry,
  instrumentDatabaseTransactions,
  instrumentQueryFailure,
} from "./database-telemetry";
import * as schema from "./schema";

export type ProjectScoutDatabase = PostgresJsDatabase<typeof schema>;
type SqlClient = ReturnType<typeof postgres>;

type DatabaseGlobals = typeof globalThis & {
  projectScoutDatabase?: ProjectScoutDatabase;
  projectScoutSqlClient?: SqlClient;
  projectScoutDatabaseShutdown?: () => void;
};

const databaseGlobals = globalThis as DatabaseGlobals;

function instrumentSqlQueries(
  sqlClient: SqlClient,
  telemetry: DatabaseTelemetry,
): SqlClient {
  return new Proxy(sqlClient, {
    apply(target, thisArgument, argumentsList) {
      return instrumentQueryFailure(
        Reflect.apply(target, thisArgument, argumentsList),
        telemetry,
      );
    },
    get(target, property) {
      if (property === "unsafe") {
        return (...argumentsList: Parameters<SqlClient["unsafe"]>) =>
          instrumentQueryFailure(target.unsafe(...argumentsList), telemetry);
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function registerGracefulShutdown(shutdownTimeoutSeconds: number): void {
  if (databaseGlobals.projectScoutDatabaseShutdown) {
    return;
  }

  const shutdown = () => {
    void closeDatabase(shutdownTimeoutSeconds);
  };
  databaseGlobals.projectScoutDatabaseShutdown = shutdown;
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

export function getDatabase(): ProjectScoutDatabase {
  if (databaseGlobals.projectScoutDatabase) {
    return databaseGlobals.projectScoutDatabase;
  }

  const environment = readDatabaseEnvironment();
  const telemetry = new DatabaseTelemetry(environment.poolMax);
  const sqlClient = postgres(environment.databaseUrl, {
    prepare: environment.connectionMode !== "transaction_pooler",
    max: environment.poolMax,
    ssl: environment.sslMode === "require" ? "require" : false,
    connect_timeout: environment.connectTimeoutSeconds,
    idle_timeout: environment.idleTimeoutSeconds,
    max_lifetime: environment.maxLifetimeSeconds,
    connection: { application_name: "projectscout-web" },
  });
  const instrumentedSqlClient = instrumentSqlQueries(sqlClient, telemetry);
  const database = instrumentDatabaseTransactions(
    drizzle(instrumentedSqlClient, { schema }),
    telemetry,
  );

  databaseGlobals.projectScoutSqlClient = sqlClient;
  databaseGlobals.projectScoutDatabase = database;
  if (environment.runtime === "long_lived") {
    registerGracefulShutdown(environment.shutdownTimeoutSeconds);
  }
  return database;
}

export async function checkDatabaseConnection(signal: AbortSignal): Promise<void> {
  getDatabase();
  const sqlClient = databaseGlobals.projectScoutSqlClient;
  if (!sqlClient) {
    throw new Error("Database client is unavailable.");
  }

  const query = sqlClient`select 1 as ready`;
  const cancelQuery = () => query.cancel();
  if (signal.aborted) {
    cancelQuery();
    throw new DOMException("Database readiness check aborted.", "AbortError");
  }

  signal.addEventListener("abort", cancelQuery, { once: true });
  try {
    await query;
  } finally {
    signal.removeEventListener("abort", cancelQuery);
  }
}

export async function closeDatabase(timeoutSeconds?: number): Promise<void> {
  const sqlClient = databaseGlobals.projectScoutSqlClient;
  databaseGlobals.projectScoutSqlClient = undefined;
  databaseGlobals.projectScoutDatabase = undefined;

  if (sqlClient) {
    await sqlClient.end({ timeout: timeoutSeconds ?? 5 });
  }
}
