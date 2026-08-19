import type { ResearchResponse } from "@/server/research/domain/research-report";

export const PROMPT_HISTORY_STORAGE_KEY =
  "projectscout.research.prompt-history.v1";

const PROMPT_HISTORY_VERSION = 3;
const MAX_PROMPT_HISTORY_ENTRIES = 20;

export type PromptHistoryEntry = {
  id: string;
  prompt: string;
  result: ResearchResponse | null;
  createdAt: string;
};

type PromptHistoryPayload = {
  version: typeof PROMPT_HISTORY_VERSION;
  entries: PromptHistoryEntry[];
};

type LegacyPromptHistoryPayload = {
  version: 1;
  prompts: string[];
};

type VersionTwoPromptHistoryEntry = {
  prompt: string;
  completed: ResearchResponse | null;
};

type StoragePort = Pick<Storage, "getItem" | "setItem">;

export interface PromptHistoryStore {
  load(): string[];
  save(prompt: string): string[];
  saveCompleted(response: ResearchResponse): string[];
  findCompleted(prompt: string): ResearchResponse | null;
}

function cleanPrompt(prompt: string): string {
  return prompt.trim().slice(0, 500);
}

function promptIdentity(prompt: string): string {
  return prompt.replace(/\s+/g, " ").toLocaleLowerCase();
}

function legacyEntryId(prompt: string): string {
  let hash = 2_166_136_261;
  for (const character of promptIdentity(cleanPrompt(prompt))) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return `legacy-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function createEntryId(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `history-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function validCreatedAt(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function legacyEntry(
  prompt: string,
  result: ResearchResponse | null,
): PromptHistoryEntry {
  const generatedAt = result?.report.generatedAt;
  return {
    id: legacyEntryId(prompt),
    prompt,
    result,
    createdAt: validCreatedAt(generatedAt)
      ? generatedAt
      : new Date(0).toISOString(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isResearchResponse(value: unknown): value is ResearchResponse {
  if (!isRecord(value) || !isRecord(value.report) || !isRecord(value.persistence)) {
    return false;
  }

  const { report, persistence } = value;
  const validPersistence = persistence.status === "failed" || (
    persistence.status === "saved" && typeof persistence.runId === "string"
  );

  return validPersistence &&
    typeof report.prompt === "string" &&
    typeof report.summary === "string" &&
    typeof report.generatedAt === "string" &&
    Array.isArray(report.sources) &&
    report.sources.every((source) => isRecord(source) &&
      typeof source.id === "string" &&
      typeof source.title === "string" &&
      typeof source.url === "string" &&
      typeof source.snippet === "string" &&
      (source.publishedAt === null || typeof source.publishedAt === "string")) &&
    Array.isArray(report.recommendations) &&
    report.recommendations.every((recommendation) => isRecord(recommendation) &&
      typeof recommendation.title === "string" &&
      typeof recommendation.targetUser === "string" &&
      typeof recommendation.problem === "string" &&
      typeof recommendation.proposedSolution === "string" &&
      isStringArray(recommendation.mvpFeatures) &&
      ["small", "medium", "large"].includes(String(recommendation.scopeEstimate)) &&
      isStringArray(recommendation.similarProducts) &&
      typeof recommendation.differentiation === "string" &&
      isStringArray(recommendation.risks) &&
      typeof recommendation.validationExperiment === "string" &&
      isStringArray(recommendation.evidenceSourceIds) &&
      ["strong", "medium", "weak"].includes(String(recommendation.evidenceStrength)) &&
      typeof recommendation.weakEvidence === "boolean");
}

function newestUniqueEntries(entries: PromptHistoryEntry[]): PromptHistoryEntry[] {
  const seen = new Set<string>();

  return entries.reduce<PromptHistoryEntry[]>((history, entry) => {
    const prompt = cleanPrompt(entry.prompt);
    const identity = promptIdentity(prompt);
    if (!prompt || seen.has(identity)) {
      return history;
    }

    seen.add(identity);
    history.push({
      id: entry.id,
      prompt,
      result: entry.result &&
        promptIdentity(entry.result.report.prompt) === identity
        ? entry.result
        : null,
      createdAt: entry.createdAt,
    });
    return history;
  }, []).slice(0, MAX_PROMPT_HISTORY_ENTRIES);
}

function parseHistory(rawHistory: string | null): PromptHistoryEntry[] {
  if (!rawHistory) {
    return [];
  }

  try {
    const payload: unknown = JSON.parse(rawHistory);
    if (!isRecord(payload)) {
      return [];
    }

    if (payload.version === 1 && Array.isArray(payload.prompts)) {
      const legacy = payload as Partial<LegacyPromptHistoryPayload>;
      if (!legacy.prompts?.every((prompt) => typeof prompt === "string")) {
        return [];
      }
      return newestUniqueEntries(
        legacy.prompts.map((prompt) => legacyEntry(prompt, null)),
      );
    }

    if (payload.version === 2 && Array.isArray(payload.entries)) {
      const entries = payload.entries.reduce<PromptHistoryEntry[]>((valid, entry) => {
        if (!isRecord(entry) || typeof entry.prompt !== "string") {
          return valid;
        }
        if (entry.completed !== null && !isResearchResponse(entry.completed)) {
          return valid;
        }
        const previous = entry as VersionTwoPromptHistoryEntry;
        valid.push(legacyEntry(previous.prompt, previous.completed));
        return valid;
      }, []);
      return newestUniqueEntries(entries);
    }

    if (payload.version !== PROMPT_HISTORY_VERSION || !Array.isArray(payload.entries)) {
      return [];
    }

    const entries = payload.entries.reduce<PromptHistoryEntry[]>((valid, entry) => {
      if (
        !isRecord(entry) ||
        typeof entry.id !== "string" ||
        !entry.id.trim() ||
        typeof entry.prompt !== "string" ||
        !validCreatedAt(entry.createdAt)
      ) {
        return valid;
      }
      if (entry.result !== null && !isResearchResponse(entry.result)) {
        return valid;
      }
      valid.push({
        id: entry.id,
        prompt: entry.prompt,
        result: entry.result,
        createdAt: entry.createdAt,
      });
      return valid;
    }, []);
    return newestUniqueEntries(entries);
  } catch {
    return [];
  }
}

export class LocalPromptHistoryStore implements PromptHistoryStore {
  constructor(private readonly storage: StoragePort) {}

  load(): string[] {
    return this.loadEntries().map((entry) => entry.prompt);
  }

  save(prompt: string): string[] {
    const existing = this.findEntry(prompt);
    return this.persist([
      {
        id: existing?.id ?? createEntryId(),
        prompt,
        result: existing?.result ?? null,
        createdAt: new Date().toISOString(),
      },
      ...this.loadEntries(),
    ]);
  }

  saveCompleted(response: ResearchResponse): string[] {
    const existing = this.findEntry(response.report.prompt);
    return this.persist([
      {
        id: existing?.id ?? createEntryId(),
        prompt: response.report.prompt,
        result: response,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      },
      ...this.loadEntries(),
    ]);
  }

  findCompleted(prompt: string): ResearchResponse | null {
    return this.findEntry(prompt)?.result ?? null;
  }

  private findEntry(prompt: string): PromptHistoryEntry | undefined {
    const identity = promptIdentity(cleanPrompt(prompt));
    return this.loadEntries().find(
      (entry) => promptIdentity(entry.prompt) === identity,
    );
  }

  private loadEntries(): PromptHistoryEntry[] {
    try {
      return parseHistory(this.storage.getItem(PROMPT_HISTORY_STORAGE_KEY));
    } catch {
      return [];
    }
  }

  private persist(entries: PromptHistoryEntry[]): string[] {
    const history = newestUniqueEntries(entries);
    const payload: PromptHistoryPayload = {
      version: PROMPT_HISTORY_VERSION,
      entries: history,
    };

    try {
      this.storage.setItem(PROMPT_HISTORY_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      return history.map((entry) => entry.prompt);
    }

    return history.map((entry) => entry.prompt);
  }
}

export class MemoryPromptHistoryStore implements PromptHistoryStore {
  private entries: PromptHistoryEntry[] = [];

  load(): string[] {
    return this.entries.map((entry) => entry.prompt);
  }

  save(prompt: string): string[] {
    const identity = promptIdentity(cleanPrompt(prompt));
    const existing = this.entries.find(
      (entry) => promptIdentity(entry.prompt) === identity,
    );
    this.entries = newestUniqueEntries([
      {
        id: existing?.id ?? createEntryId(),
        prompt,
        result: existing?.result ?? null,
        createdAt: new Date().toISOString(),
      },
      ...this.entries,
    ]);
    return this.load();
  }

  saveCompleted(response: ResearchResponse): string[] {
    const identity = promptIdentity(cleanPrompt(response.report.prompt));
    const existing = this.entries.find(
      (entry) => promptIdentity(entry.prompt) === identity,
    );
    this.entries = newestUniqueEntries([
      {
        id: existing?.id ?? createEntryId(),
        prompt: response.report.prompt,
        result: response,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      },
      ...this.entries,
    ]);
    return this.load();
  }

  findCompleted(prompt: string): ResearchResponse | null {
    const identity = promptIdentity(cleanPrompt(prompt));
    return this.entries.find(
      (entry) => promptIdentity(entry.prompt) === identity,
    )?.result ?? null;
  }
}

export function createBrowserPromptHistoryStore(): PromptHistoryStore {
  try {
    return new LocalPromptHistoryStore(window.localStorage);
  } catch {
    return new MemoryPromptHistoryStore();
  }
}
