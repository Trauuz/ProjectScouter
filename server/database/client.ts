import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { readDatabaseEnvironment } from "./database-environment";
import * as schema from "./schema";

export type ProjectScoutDatabase = PostgresJsDatabase<typeof schema>;

type DatabaseGlobals = typeof globalThis & {
  projectScoutDatabase?: ProjectScoutDatabase;
  projectScoutSqlClient?: ReturnType<typeof postgres>;
};

const databaseGlobals = globalThis as DatabaseGlobals;

export function getDatabase(): ProjectScoutDatabase {
  if (databaseGlobals.projectScoutDatabase) {
    return databaseGlobals.projectScoutDatabase;
  }

  const { databaseUrl } = readDatabaseEnvironment();
  const sqlClient = postgres(databaseUrl, {
    prepare: false,
    max: 1,
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 30 * 60,
  });
  const database = drizzle(sqlClient, { schema });

  databaseGlobals.projectScoutSqlClient = sqlClient;
  databaseGlobals.projectScoutDatabase = database;
  return database;
}
