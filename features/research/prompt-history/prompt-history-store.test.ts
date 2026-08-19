import { describe, expect, it } from "vitest";

import {
  LocalPromptHistoryStore,
  MemoryPromptHistoryStore,
  PROMPT_HISTORY_STORAGE_KEY,
} from "./prompt-history-store";
import type { ResearchResponse } from "@/server/research/domain/research-report";

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  private readonly entries = new Map<string, string>();

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }
}

const completedResearch: ResearchResponse = {
  report: {
    prompt: "A finance tracker for businesses",
    summary: "Small businesses need clearer cash-flow forecasts.",
    generatedAt: "2026-08-19T00:00:00.000Z",
    sources: [],
    recommendations: [],
  },
  persistence: {
    status: "saved",
    runId: "db19db89-670b-4307-900c-c1a9e80c488a",
  },
};

describe("LocalPromptHistoryStore", () => {
  it("persists newest prompts first and restores them from storage", () => {
    const storage = new MemoryStorage();
    const store = new LocalPromptHistoryStore(storage);

    store.save("First valid research prompt");
    store.save("Second valid research prompt");

    expect(new LocalPromptHistoryStore(storage).load()).toEqual([
      "Second valid research prompt",
      "First valid research prompt",
    ]);
    expect(storage.getItem(PROMPT_HISTORY_STORAGE_KEY)).not.toBeNull();
  });

  it("moves a repeated prompt to the front without duplicating it", () => {
    const storage = new MemoryStorage();
    const store = new LocalPromptHistoryStore(storage);

    store.save("A finance tracker for businesses");
    store.save("A student budgeting assistant");

    expect(store.save("  A FINANCE tracker for businesses  ")).toEqual([
      "A FINANCE tracker for businesses",
      "A student budgeting assistant",
    ]);
  });

  it("restores the completed research response associated with a prompt", () => {
    const storage = new MemoryStorage();
    const store = new LocalPromptHistoryStore(storage);

    store.saveCompleted(completedResearch);

    const restoredStore = new LocalPromptHistoryStore(storage);
    expect(restoredStore.load()).toEqual([completedResearch.report.prompt]);
    expect(restoredStore.findCompleted(completedResearch.report.prompt))
      .toEqual(completedResearch);
  });

  it("persists a completed session with a stable id and creation timestamp", () => {
    const storage = new MemoryStorage();
    const store = new LocalPromptHistoryStore(storage);

    store.saveCompleted(completedResearch);

    const rawHistory = storage.getItem(PROMPT_HISTORY_STORAGE_KEY);
    expect(rawHistory).not.toBeNull();
    const payload = JSON.parse(rawHistory!) as {
      version: number;
      entries: Array<Record<string, unknown>>;
    };
    expect(payload.version).toBe(3);
    expect(payload.entries).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        prompt: completedResearch.report.prompt,
        result: completedResearch,
        createdAt: expect.any(String),
      }),
    ]);
    expect(Number.isNaN(Date.parse(String(payload.entries[0]?.createdAt))))
      .toBe(false);
  });

  it("migrates version-one prompt-only history without inventing results", () => {
    const storage = new MemoryStorage();
    storage.setItem(PROMPT_HISTORY_STORAGE_KEY, JSON.stringify({
      version: 1,
      prompts: ["A legacy saved research prompt"],
    }));

    const store = new LocalPromptHistoryStore(storage);
    expect(store.load()).toEqual(["A legacy saved research prompt"]);
    expect(store.findCompleted("A legacy saved research prompt")).toBeNull();
  });

  it("ignores malformed persisted data", () => {
    const storage = new MemoryStorage();
    storage.setItem(PROMPT_HISTORY_STORAGE_KEY, "not-json");

    expect(new LocalPromptHistoryStore(storage).load()).toEqual([]);
  });

  it("retains older prompts beyond the compact workspace list", () => {
    const store = new LocalPromptHistoryStore(new MemoryStorage());

    for (let number = 1; number <= 6; number += 1) {
      store.save(`Research prompt number ${number}`);
    }

    expect(store.load()).toHaveLength(6);
  });

  it.each([
    ["local", () => new LocalPromptHistoryStore(new MemoryStorage())],
    ["memory", () => new MemoryPromptHistoryStore()],
  ])("provides the complete runtime contract in the %s store", (_name, createStore) => {
    const store = createStore();

    expect(typeof store.load).toBe("function");
    expect(typeof store.save).toBe("function");
    expect(typeof store.saveCompleted).toBe("function");
    expect(typeof store.findCompleted).toBe("function");

    store.saveCompleted(completedResearch);
    expect(store.findCompleted(completedResearch.report.prompt))
      .toEqual(completedResearch);
  });
});
