import { z } from "zod";

const STORAGE_KEY = "projectscout_pending_auth_intent";
const INTENT_LIFETIME_MS = 30 * 60 * 1_000;

const pendingAuthIntentSchema = z.discriminatedUnion("kind", [
  z.object({
    version: z.literal(1),
    id: z.string().uuid(),
    kind: z.literal("open_research"),
    status: z.enum(["pending", "awaiting_confirmation"]),
    createdAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
  }),
  z.object({
    version: z.literal(1),
    id: z.string().uuid(),
    kind: z.literal("run_research"),
    prompt: z.string().min(10).max(500),
    status: z.enum(["pending", "awaiting_confirmation"]),
    createdAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
  }),
]);

export type PendingAuthIntent = z.infer<typeof pendingAuthIntentSchema>;
export type NewPendingAuthIntent =
  | { kind: "open_research" }
  | { kind: "run_research"; prompt: string };

type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export class LocalPendingAuthIntentStore {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly now: () => number = Date.now,
  ) {}

  save(intent: NewPendingAuthIntent): PendingAuthIntent {
    const createdAt = this.now();
    const saved = pendingAuthIntentSchema.parse({
      version: 1,
      id: crypto.randomUUID(),
      ...intent,
      status: "pending",
      createdAt,
      expiresAt: createdAt + INTENT_LIFETIME_MS,
    });
    this.storage.setItem(STORAGE_KEY, JSON.stringify(saved));
    return saved;
  }

  peek(): PendingAuthIntent | null {
    const persisted = this.storage.getItem(STORAGE_KEY);
    if (!persisted) {
      return null;
    }

    try {
      const result = pendingAuthIntentSchema.safeParse(JSON.parse(persisted));
      if (!result.success || result.data.expiresAt <= this.now()) {
        this.storage.removeItem(STORAGE_KEY);
        return null;
      }
      return result.data;
    } catch {
      this.storage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  consume(expectedId: string): PendingAuthIntent | null {
    const intent = this.peek();
    if (!intent || intent.id !== expectedId) {
      return null;
    }

    this.storage.removeItem(STORAGE_KEY);
    return intent;
  }

  markAwaitingConfirmation(expectedId: string): PendingAuthIntent | null {
    const intent = this.peek();
    if (!intent || intent.id !== expectedId) {
      return null;
    }

    const updated = { ...intent, status: "awaiting_confirmation" as const };
    this.storage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }

  clearPending(): void {
    if (this.peek()?.status === "pending") {
      this.storage.removeItem(STORAGE_KEY);
    }
  }
}

export function createPendingAuthIntentStore(): LocalPendingAuthIntentStore {
  return new LocalPendingAuthIntentStore(window.localStorage);
}
