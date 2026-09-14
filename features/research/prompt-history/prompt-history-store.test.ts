import { describe, expect, it } from "vitest";

import {
  LocalPromptHistoryStore,
  MemoryPromptHistoryStore,
  PROMPT_HISTORY_STORAGE_KEY,
} from "./prompt-history-store";

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

describe("prompt history clearing", () => {
  it("removes the complete persisted research payload without touching preferences", () => {
    const storage = new TestStorage();
    storage.setItem("projectscout.theme", "dark");
    const store = new LocalPromptHistoryStore(storage);
    store.save("Compare local-first note-taking applications");

    store.clear();

    expect(storage.getItem(PROMPT_HISTORY_STORAGE_KEY)).toBeNull();
    expect(storage.getItem("projectscout.theme")).toBe("dark");
    expect(new LocalPromptHistoryStore(storage).loadEntries()).toEqual([]);
  });

  it("clears in-memory history so it cannot survive an account change", () => {
    const store = new MemoryPromptHistoryStore();
    store.save("Compare sustainable packaging suppliers");

    store.clear();

    expect(store.loadEntries()).toEqual([]);
  });
});
