import { describe, expect, it } from "vitest";

import {
  RESEARCH_VISITOR_COOKIE,
  rotateVisitorSession,
} from "./visitor-session";

describe("rotateVisitorSession", () => {
  it("replaces the claimed visitor session with a fresh secure cookie", () => {
    const originalSessionId = "9eeace6b-f753-43d0-8e4c-a9a251ba52d2";
    let stored = { value: originalSessionId };
    let storedOptions: Record<string, unknown> | undefined;
    const cookieStore = {
      get: () => stored,
      set: (
        name: string,
        value: string,
        options: Record<string, unknown>,
      ) => {
        expect(name).toBe(RESEARCH_VISITOR_COOKIE);
        stored = { value };
        storedOptions = options;
      },
    };

    const rotated = rotateVisitorSession(cookieStore as never, true);

    expect(rotated.toString()).not.toBe(originalSessionId);
    expect(stored.value).toBe(rotated.toString());
    expect(storedOptions).toEqual(expect.objectContaining({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    }));
  });
});
