"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createBrowserPromptHistoryStore,
  type PromptHistoryEntry,
  type PromptHistoryStore,
} from "./prompt-history-store";
import type { ResearchResponse } from "@/server/research/domain/research-report";

type PromptHistory = {
  entries: PromptHistoryEntry[];
  rememberPrompt(prompt: string): string | null;
  rememberCompletedResearch(response: ResearchResponse): string | null;
  deleteResearch(id: string): Promise<void>;
  findCompletedResearch(id: string): ResearchResponse | null;
};

const STORE_METHODS = [
  "load",
  "loadEntries",
  "save",
  "saveCompleted",
  "delete",
  "findCompleted",
] as const;

function satisfiesPromptHistoryContract(
  candidate: unknown,
): candidate is PromptHistoryStore {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const store = candidate as Record<string, unknown>;
  return STORE_METHODS.every((method) => typeof store[method] === "function");
}

export function resolvePromptHistoryStore(
  current: unknown,
  createStore: () => PromptHistoryStore,
): PromptHistoryStore {
  if (satisfiesPromptHistoryContract(current)) {
    return current;
  }

  const replacement = createStore();
  if (!satisfiesPromptHistoryContract(replacement)) {
    throw new TypeError("Prompt history store does not satisfy its runtime contract.");
  }
  return replacement;
}

export function usePromptHistory(
  createStore: () => PromptHistoryStore = createBrowserPromptHistoryStore,
): PromptHistory {
  const storeRef = useRef<PromptHistoryStore | null>(null);
  const [entries, setEntries] = useState<PromptHistoryEntry[]>([]);

  const getStore = useCallback(() => {
    storeRef.current = resolvePromptHistoryStore(storeRef.current, createStore);
    return storeRef.current;
  }, [createStore]);

  useEffect(() => {
    setEntries(getStore().loadEntries());
  }, [getStore]);

  const rememberPrompt = useCallback(
    (prompt: string) => {
      const store = getStore();
      store.save(prompt);
      const nextEntries = store.loadEntries();
      setEntries(nextEntries);
      return nextEntries[0]?.id ?? null;
    },
    [getStore],
  );

  const rememberCompletedResearch = useCallback(
    (response: ResearchResponse) => {
      const store = getStore();
      store.saveCompleted(response);
      const nextEntries = store.loadEntries();
      setEntries(nextEntries);
      return nextEntries[0]?.id ?? null;
    },
    [getStore],
  );

  const deleteResearch = useCallback(
    async (id: string) => {
      await Promise.resolve();
      const store = getStore();
      store.delete(id);
      setEntries(store.loadEntries());
    },
    [getStore],
  );

  const findCompletedResearch = useCallback(
    (id: string) => getStore().findCompleted(id),
    [getStore],
  );

  return {
    entries,
    rememberPrompt,
    rememberCompletedResearch,
    deleteResearch,
    findCompletedResearch,
  };
}
