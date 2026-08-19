import { describe, expect, it } from "vitest";

import { VisitorSessionId } from "./research-owner";

describe("VisitorSessionId", () => {
  it("accepts a UUID and rejects a value that could be used for session injection", () => {
    const sessionId = VisitorSessionId.create(
      "35f406bc-f482-4a23-9106-b9ae6da71b1d",
    );

    expect(sessionId.toString()).toBe("35f406bc-f482-4a23-9106-b9ae6da71b1d");
    expect(() => VisitorSessionId.create("../../another-session")).toThrow();
  });

  it("generates a valid, unique visitor identifier", () => {
    const first = VisitorSessionId.generate();
    const second = VisitorSessionId.generate();

    expect(first.toString()).not.toBe(second.toString());
    expect(() => VisitorSessionId.create(first.toString())).not.toThrow();
  });
});
