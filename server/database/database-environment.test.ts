import { describe, expect, it } from "vitest";

import { readDatabaseEnvironment } from "./database-environment";

describe("readDatabaseEnvironment", () => {
  it("reads a server-only Postgres connection string", () => {
    expect(
      readDatabaseEnvironment({
        DATABASE_URL: "postgres://postgres:secret@localhost:6543/postgres",
      }),
    ).toEqual({
      databaseUrl: "postgres://postgres:secret@localhost:6543/postgres",
    });
  });

  it("rejects missing and non-Postgres database URLs", () => {
    expect(() => readDatabaseEnvironment({})).toThrow("DATABASE_URL");
    expect(() =>
      readDatabaseEnvironment({ DATABASE_URL: "https://example.com/database" }),
    ).toThrow("DATABASE_URL");
  });
});
