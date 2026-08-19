// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import { LocalPendingAuthIntentStore } from "./pending-auth-intent-store";

const prompt = "Build a finance tracker for independent studios";

describe("LocalPendingAuthIntentStore", () => {
  beforeEach(() => window.localStorage.clear());

  it("keeps only the newest pending research action", () => {
    const store = new LocalPendingAuthIntentStore(window.localStorage, () => 1_000);
    const first = store.save({ kind: "open_research" });
    const second = store.save({ kind: "run_research", prompt });

    expect(store.peek()).toMatchObject({
      id: second.id,
      kind: "run_research",
      prompt,
      status: "pending",
    });
    expect(store.consume(first.id)).toBeNull();
  });

  it("consumes a matching intent exactly once", () => {
    const store = new LocalPendingAuthIntentStore(window.localStorage, () => 1_000);
    const intent = store.save({ kind: "run_research", prompt });

    expect(store.consume(intent.id)).toMatchObject({ prompt });
    expect(store.consume(intent.id)).toBeNull();
  });

  it("retains an awaiting-confirmation intent when pending intents are cleared", () => {
    const store = new LocalPendingAuthIntentStore(window.localStorage, () => 1_000);
    const intent = store.save({ kind: "run_research", prompt });

    store.markAwaitingConfirmation(intent.id);
    store.clearPending();

    expect(store.peek()).toMatchObject({
      id: intent.id,
      status: "awaiting_confirmation",
    });
  });

  it("removes expired and malformed persisted values", () => {
    const store = new LocalPendingAuthIntentStore(window.localStorage, () => 1_000);
    const intent = store.save({ kind: "open_research" });

    const futureStore = new LocalPendingAuthIntentStore(
      window.localStorage,
      () => intent.expiresAt + 1,
    );
    expect(futureStore.peek()).toBeNull();

    window.localStorage.setItem("projectscout_pending_auth_intent", "not-json");
    expect(store.peek()).toBeNull();
  });
});
