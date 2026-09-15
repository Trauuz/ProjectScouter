import { describe, expect, it, vi } from "vitest";

import {
  DatabaseTelemetry,
  instrumentDatabaseTransactions,
  instrumentQueryFailure,
  type DatabaseTelemetryEvent,
} from "./database-telemetry";

describe("database connection telemetry", () => {
  it("records acquisition time, concurrent active connections, and query failures", async () => {
    const events: DatabaseTelemetryEvent[] = [];
    const telemetry = new DatabaseTelemetry(4, (event) => events.push(event));
    let releaseFirst!: () => void;
    const firstCanFinish = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let callbacksStarted = 0;

    const database = {
      transaction: vi.fn(async (work: (transaction: object) => Promise<unknown>) => {
        callbacksStarted += 1;
        return work({});
      }),
    };
    const instrumented = instrumentDatabaseTransactions(database as never, telemetry);

    const first = instrumented.transaction(async () => firstCanFinish);
    const second = instrumented.transaction(async () => {
      await firstCanFinish;
      throw new Error("simulated query failure");
    });
    const secondAssertion = expect(second).rejects.toThrow("simulated query failure");

    await vi.waitFor(() => expect(callbacksStarted).toBe(2));
    expect(telemetry.snapshot()).toMatchObject({ activeConnections: 2 });
    releaseFirst();
    await expect(first).resolves.toBeUndefined();
    await secondAssertion;

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "database.connection.acquired",
        activeConnections: 2,
      }),
      expect.objectContaining({
        name: "database.query.failed",
        phase: "query",
      }),
    ]));
    expect(telemetry.snapshot()).toEqual({
      activeConnections: 0,
      peakActiveConnections: 2,
      poolMax: 4,
      queryFailures: 1,
    });
  });

  it("records direct query rejection without retaining sensitive error content", () => {
    const events: DatabaseTelemetryEvent[] = [];
    const telemetry = new DatabaseTelemetry(4, (event) => events.push(event));
    const reject = vi.fn();
    const query = instrumentQueryFailure({ reject }, telemetry);

    query.reject(new Error("secret SQL parameter"));

    expect(reject).toHaveBeenCalledOnce();
    expect(events).toEqual([
      expect.objectContaining({
        name: "database.query.failed",
        phase: "query",
        errorType: "Error",
      }),
    ]);
    expect(JSON.stringify(events)).not.toContain("secret SQL parameter");
  });
});
