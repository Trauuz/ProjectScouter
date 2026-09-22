const HEALTH_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export type ReadinessCheck = {
  name: string;
  run(signal: AbortSignal): Promise<void>;
};

export type ReadinessFailure = {
  failedChecks: string[];
  timedOutChecks: string[];
  durationMs: number;
};

type ReadinessDependencies = {
  checks: readonly ReadinessCheck[];
  timeoutMs: number;
  reportFailure(failure: ReadinessFailure): void;
};

type CheckResult = {
  name: string;
  status: "passed" | "failed" | "timed_out";
};

class ReadinessTimeout extends Error {
  constructor() {
    super("Readiness check timed out.");
    this.name = "ReadinessTimeout";
  }
}

async function runWithTimeout(
  check: ReadinessCheck,
  timeoutMs: number,
): Promise<CheckResult> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  try {
    await Promise.race([
      check.run(controller.signal),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new ReadinessTimeout());
          controller.abort();
        }, timeoutMs);
      }),
    ]);
    return { name: check.name, status: "passed" };
  } catch (reason) {
    return {
      name: check.name,
      status: reason instanceof ReadinessTimeout ? "timed_out" : "failed",
    };
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export function createLivenessHandler() {
  return async function GET(): Promise<Response> {
    return Response.json({ status: "alive" }, { headers: HEALTH_HEADERS });
  };
}

export function createReadinessHandler({
  checks,
  timeoutMs,
  reportFailure,
}: ReadinessDependencies) {
  return async function GET(): Promise<Response> {
    const startedAt = performance.now();
    const results = await Promise.all(
      checks.map((check) => runWithTimeout(check, timeoutMs)),
    );
    const failedChecks = results
      .filter((result) => result.status === "failed")
      .map((result) => result.name);
    const timedOutChecks = results
      .filter((result) => result.status === "timed_out")
      .map((result) => result.name);

    if (failedChecks.length === 0 && timedOutChecks.length === 0) {
      return Response.json({ status: "ready" }, { headers: HEALTH_HEADERS });
    }

    reportFailure({
      failedChecks,
      timedOutChecks,
      durationMs: Math.round(performance.now() - startedAt),
    });
    return Response.json(
      { status: "unavailable" },
      {
        status: 503,
        headers: { ...HEALTH_HEADERS, "Retry-After": "5" },
      },
    );
  };
}
