import "dotenv/config";

import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.DATABASE_MIGRATION_URL?.trim() ||
  process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error(
    "Set DATABASE_MIGRATION_URL or DATABASE_URL before running Drizzle Kit.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/database/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl },
  migrations: {
    prefix: "supabase",
    schema: "drizzle",
    table: "__drizzle_migrations",
  },
  strict: true,
  verbose: true,
});
