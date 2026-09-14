import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { researchRuns } from "../../database/schema";
import {
  VisitorSessionId,
  type ResearchOwner,
} from "../domain/research-owner";
import { DrizzleResearchRunRepository } from "./drizzle-research-run-repository";

const SESSION_ID = "2104b1d1-f1fa-4dce-9148-e9d3382b70e7";
const USER_A_ID = "56f08df0-655f-4562-ae65-a6d38e47c25a";
const USER_B_ID = "c697e416-613f-40b1-b22f-c3195ca23465";
const USER_C_ID = "a38cbb77-45f3-4059-a786-75753e72af0f";

type ResearchRunOwnership = {
  id: string;
  sessionId: string;
  userId: string | null;
};

class OwnershipDatabase {
  constructor(readonly rows: ResearchRunOwnership[]) {}

  update(table: unknown) {
    if (table !== researchRuns) {
      throw new Error("Unexpected table update.");
    }

    return {
      set: (values: { userId: string }) => ({
        where: (condition: unknown) => ({
          returning: async () => {
            const query = new PgDialect().sqlToQuery(condition as never);
            const sessionId = String(query.params[0]);
            const requiresAnonymousOwner = query.sql.includes("is null");
            const attached: Array<{ id: string }> = [];

            for (const row of this.rows) {
              if (row.sessionId !== sessionId) {
                continue;
              }
              if (requiresAnonymousOwner && row.userId !== null) {
                continue;
              }

              row.userId = values.userId;
              attached.push({ id: row.id });
            }

            return attached;
          },
        }),
      }),
    };
  }
}

class AuthorizationDatabase {
  constructor(private readonly row: ResearchRunOwnership) {}

  select() {
    return {
      from: (table: unknown) => {
        if (table === researchRuns) {
          return {
            where: (condition: unknown) => ({
              limit: async () => this.authorized(condition)
                ? [{
                    ...this.row,
                    prompt: "Project topic",
                    summary: "Summary",
                    generatedAt: new Date("2026-09-14T00:00:00.000Z"),
                    createdAt: new Date("2026-09-14T00:00:00.000Z"),
                  }]
                : [],
            }),
          };
        }

        return {
          where: () => ({ orderBy: async () => [] }),
        };
      },
    };
  }

  private authorized(condition: unknown): boolean {
    const query = new PgDialect().sqlToQuery(condition as never);
    const parameters = query.params.map(String);
    const idMatches = parameters.includes(this.row.id);
    const sessionMatches = parameters.includes(this.row.sessionId);
    const userMatches = Boolean(
      this.row.userId && parameters.includes(this.row.userId),
    );
    const requiresUnowned = query.sql.includes("is null");

    if (!idMatches || (requiresUnowned && this.row.userId !== null)) {
      return false;
    }

    return query.sql.includes(" or ")
      ? sessionMatches || userMatches
      : (!query.sql.includes("session_id") || sessionMatches) &&
          (!query.sql.includes("user_id\" =") || userMatches);
  }
}

class AnonymousListDatabase {
  constructor(private readonly rows: ResearchRunOwnership[]) {}

  select() {
    return {
      from: () => ({
        where: (condition: unknown) => ({
          orderBy: () => ({
            limit: async (limit: number) => {
              const query = new PgDialect().sqlToQuery(condition as never);
              const sessionId = String(query.params[0]);
              const requiresUnowned = query.sql.includes("is null");
              return this.rows
                .filter((row) => row.sessionId === sessionId)
                .filter((row) => !requiresUnowned || row.userId === null)
                .slice(0, limit)
                .map((row) => ({
                  id: row.id,
                  prompt: "Project topic",
                  summary: "Summary",
                  generatedAt: new Date("2026-09-14T00:00:00.000Z"),
                  createdAt: new Date("2026-09-14T00:00:00.000Z"),
                }));
            },
          }),
        }),
      }),
    };
  }
}

function owner(sessionId: string, userId: string | null): ResearchOwner {
  return { sessionId: VisitorSessionId.create(sessionId), userId };
}

describe("DrizzleResearchRunRepository.attachResearchRunsToUser", () => {
  it("does not reassign user A's run when user B has the same visitor session", async () => {
    const database = new OwnershipDatabase([
      { id: "owned", sessionId: SESSION_ID, userId: USER_A_ID },
      { id: "anonymous", sessionId: SESSION_ID, userId: null },
    ]);
    const repository = new DrizzleResearchRunRepository(database as never);

    const attached = await repository.attachResearchRunsToUser(
      VisitorSessionId.create(SESSION_ID),
      USER_B_ID,
    );

    expect(attached).toBe(1);
    expect(database.rows).toEqual([
      { id: "owned", sessionId: SESSION_ID, userId: USER_A_ID },
      { id: "anonymous", sessionId: SESSION_ID, userId: USER_B_ID },
    ]);
  });

  it("assigns all anonymous rows to exactly one concurrent claimant", async () => {
    const database = new OwnershipDatabase([
      { id: "first", sessionId: SESSION_ID, userId: null },
      { id: "second", sessionId: SESSION_ID, userId: null },
    ]);
    const repository = new DrizzleResearchRunRepository(database as never);
    const sessionId = VisitorSessionId.create(SESSION_ID);

    const counts = await Promise.all([
      repository.attachResearchRunsToUser(sessionId, USER_B_ID),
      repository.attachResearchRunsToUser(sessionId, USER_C_ID),
    ]);

    expect(counts.sort()).toEqual([0, 2]);
    expect(new Set(database.rows.map((row) => row.userId)).size).toBe(1);
  });

  it("validates both authenticated user and visitor session IDs", async () => {
    const database = new OwnershipDatabase([]);
    const repository = new DrizzleResearchRunRepository(database as never);
    const invalidSession = {
      toString: () => "not-a-session-id",
    } as unknown as VisitorSessionId;

    await expect(
      repository.attachResearchRunsToUser(
        VisitorSessionId.create(SESSION_ID),
        "not-a-user-id",
      ),
    ).rejects.toThrow();
    await expect(
      repository.attachResearchRunsToUser(invalidSession, USER_B_ID),
    ).rejects.toThrow();
  });
});

describe("DrizzleResearchRunRepository research authorization", () => {
  it.each([
    [
      "allows an anonymous visitor with the matching session to read an unowned row",
      null,
      SESSION_ID,
      null,
      true,
    ],
    [
      "denies an anonymous visitor with the matching session from an owned row",
      USER_A_ID,
      SESSION_ID,
      null,
      false,
    ],
    [
      "allows the authenticated owner regardless of visitor session",
      USER_A_ID,
      "1fb69f3a-0025-4d99-bd1f-4ca778c0d45c",
      USER_A_ID,
      true,
    ],
    [
      "denies an authenticated non-owner even with the matching visitor session",
      USER_A_ID,
      SESSION_ID,
      USER_B_ID,
      false,
    ],
    [
      "denies an authenticated non-owner without the matching visitor session",
      USER_A_ID,
      "66e33809-4fec-407d-8eb9-e20fb3833ae4",
      USER_B_ID,
      false,
    ],
  ])("%s", async (_label, rowUserId, ownerSessionId, ownerUserId, allowed) => {
    const runId = "d6bbbea9-9144-4121-82c7-0b588ffdc5f0";
    const database = new AuthorizationDatabase({
      id: runId,
      sessionId: SESSION_ID,
      userId: rowUserId,
    });
    const repository = new DrizzleResearchRunRepository(database as never);

    const result = await repository.fetchResearchRunWithDetails(
      runId,
      owner(ownerSessionId, ownerUserId),
    );

    expect(result !== null).toBe(allowed);
  });

  it("returns the same null result for forbidden and nonexistent runs", async () => {
    const runId = "d6bbbea9-9144-4121-82c7-0b588ffdc5f0";
    const repository = new DrizzleResearchRunRepository(
      new AuthorizationDatabase({
        id: runId,
        sessionId: SESSION_ID,
        userId: USER_A_ID,
      }) as never,
    );
    const nonOwner = owner(SESSION_ID, USER_B_ID);

    const forbidden = await repository.fetchResearchRunWithDetails(
      runId,
      nonOwner,
    );
    const nonexistent = await repository.fetchResearchRunWithDetails(
      "f071df30-29fb-4e52-b213-bb3f5a3c568c",
      nonOwner,
    );

    expect(forbidden).toBeNull();
    expect(nonexistent).toBeNull();
  });

  it("lists only unowned rows for an anonymous visitor session", async () => {
    const database = new AnonymousListDatabase([
      { id: "anonymous", sessionId: SESSION_ID, userId: null },
      { id: "owned", sessionId: SESSION_ID, userId: USER_A_ID },
    ]);
    const repository = new DrizzleResearchRunRepository(database as never);

    const runs = await repository.listRecentResearchRunsBySessionId(
      VisitorSessionId.create(SESSION_ID),
    );

    expect(runs.map((run) => run.id)).toEqual(["anonymous"]);
  });
});
