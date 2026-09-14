import { describe, expect, it } from "vitest";

import { LocalPendingAuthIntentStore } from "./pending-auth-intent-store";

class TestStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("LocalPendingAuthIntentStore.clear", () => {
  it("removes an intent even while it awaits email confirmation", () => {
    const store = new LocalPendingAuthIntentStore(new TestStorage(), () => 1_000);
    const intent = store.save({
      kind: "run_research",
      prompt: "Compare privacy-focused analytics platforms",
    });
    store.markAwaitingConfirmation(intent.id);

    store.clear();

    expect(store.peek()).toBeNull();
  });
});
