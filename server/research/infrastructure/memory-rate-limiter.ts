import type {
  RateLimiter,
  RateLimitResult,
} from "../application/rate-limiter";

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
  now?: () => number;
};

type RateLimitEntry = {
  count: number;
  windowStartedAt: number;
};

export class MemoryRateLimiter implements RateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>();
  private readonly config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = { ...config, now: config.now ?? Date.now };
  }

  check(key: string): RateLimitResult {
    const now = this.config.now();
    const current = this.entries.get(key);

    if (!current || now - current.windowStartedAt >= this.config.windowMs) {
      this.entries.set(key, { count: 1, windowStartedAt: now });
      return { allowed: true };
    }

    if (current.count >= this.config.maxRequests) {
      const remainingMs = this.config.windowMs - (now - current.windowStartedAt);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1_000)),
      };
    }

    current.count += 1;
    return { allowed: true };
  }
}
