import { describe, expect, it } from "vitest";

import { usageDialogPresentation } from "./usage-dialog-state";

const USAGE = {
  limit: 5,
  used: 2,
  remaining: 3,
  periodStart: "2026-09-01",
  resetsAt: "2026-10-01T00:00:00.000Z",
};

describe("usage dialog presentation", () => {
  it("presents an explicit loading state", () => {
    expect(usageDialogPresentation({ status: "loading" })).toMatchObject({
      state: "loading",
      balance: "Loading…",
      showRetry: false,
    });
  });

  it("presents a retryable error state", () => {
    expect(usageDialogPresentation({ status: "error" })).toEqual({
      state: "error",
      balance: "Unavailable",
      note: "Usage is temporarily unavailable.",
      showRetry: true,
    });
  });

  it("presents an explicit empty state before any credits are used", () => {
    expect(usageDialogPresentation({
      status: "ready",
      usage: { ...USAGE, used: 0, remaining: 5 },
    })).toMatchObject({
      state: "empty",
      balance: "5 of 5",
      note: expect.stringContaining("haven’t used any research credits"),
      showRetry: false,
    });
  });

  it("presents a populated usage state", () => {
    expect(usageDialogPresentation({ status: "ready", usage: USAGE })).toMatchObject({
      state: "ready",
      balance: "3 of 5",
      note: expect.stringContaining("Resets October 1"),
      showRetry: false,
    });
  });
});
