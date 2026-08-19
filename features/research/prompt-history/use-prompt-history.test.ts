import { describe, expect, it, vi } from "vitest";

import { MemoryPromptHistoryStore } from "./prompt-history-store";
import { resolvePromptHistoryStore } from "./use-prompt-history";

describe("resolvePromptHistoryStore", () => {
  it("replaces a stale pre-contract store retained by Fast Refresh", () => {
    const replacement = new MemoryPromptHistoryStore();
    const createStore = vi.fn(() => replacement);
    const staleStore = {
      load: () => [],
      save: () => [],
    };

    expect(resolvePromptHistoryStore(staleStore, createStore)).toBe(replacement);
    expect(createStore).toHaveBeenCalledOnce();
  });

  it("keeps an existing store that satisfies the complete runtime contract", () => {
    const current = new MemoryPromptHistoryStore();
    const createStore = vi.fn(() => new MemoryPromptHistoryStore());

    expect(resolvePromptHistoryStore(current, createStore)).toBe(current);
    expect(createStore).not.toHaveBeenCalled();
  });
});
