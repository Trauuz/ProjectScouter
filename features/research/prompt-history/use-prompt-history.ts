"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createBrowserPromptHistoryStore,
  type PromptHistoryStore,
} from "./prompt-history-store";
import type { ResearchResponse } from "@/server/research/domain/research-report";

type PromptHistory = {
  prompts: string[];
  rememberPrompt(prompt: string): void;
  rememberCompletedResearch(response: ResearchResponse): void;
  findCompletedResearch(prompt: string): ResearchResponse | null;
};

const STORE_METHODS = [
  "load",
  "save",
  "saveCompleted",
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
  const [prompts, setPrompts] = useState<string[]>([]);

  const getStore = useCallback(() => {
    storeRef.current = resolvePromptHistoryStore(storeRef.current, createStore);
    return storeRef.current;
  }, [createStore]);

  useEffect(() => {
    setPrompts(getStore().load());
  }, [getStore]);

  const rememberPrompt = useCallback(
    (prompt: string) => {
      setPrompts(getStore().save(prompt));
    },
    [getStore],
  );

  const rememberCompletedResearch = useCallback(
    (response: ResearchResponse) => {
      setPrompts(getStore().saveCompleted(response));
    },
    [getStore],
  );

  const findCompletedResearch = useCallback(
    (prompt: string) => getStore().findCompleted(prompt),
    [getStore],
  );

  return {
    prompts,
    rememberPrompt,
    rememberCompletedResearch,
    findCompletedResearch,
  };
}
