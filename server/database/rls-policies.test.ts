import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SERVER_ONLY_TABLES = [
  "research_runs",
  "research_sources",
  "project_recommendations",
  "recommendation_sources",
  "account_monthly_usage",
] as const;

function readMigrationSql(): string {
  const migrationDirectory = join(process.cwd(), "drizzle");

  return readdirSync(migrationDirectory)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort()
    .map((fileName) => readFileSync(join(migrationDirectory, fileName), "utf8"))
    .join("\n");
}

describe("server-only database row security", () => {
  it.each(SERVER_ONLY_TABLES)(
    "keeps projectscout.%s inaccessible to every RLS-controlled role",
    (tableName) => {
      const migrations = readMigrationSql();
      const policy = [
        'CREATE POLICY "server_only_deny_all"',
        `ON "projectscout"."${tableName}"`,
        "AS RESTRICTIVE",
        "FOR ALL",
        "TO PUBLIC",
        "USING (false)",
        "WITH CHECK (false);",
      ].join("\n");

      expect(migrations).toContain(policy);
    },
  );
});
