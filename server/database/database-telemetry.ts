import type { ProjectScoutDatabase } from "./client";
import { logger } from "../observability/structured-logger";

export type DatabaseTelemetryEvent = Readonly<
  | {
      name: "database.connection.acquired";
      acquisitionMs: number;
      activeConnections: number;
      poolMax: number;
    }
  | {
      name: "database.connection.released";
      activeConnections: number;
      poolMax: number;
    }
  | {
      name: "database.query.failed";
      phase: "acquisition" | "query";
      activeConnections: number;
      poolMax: number;
      errorType: string;
    }
>;

export type DatabaseTelemetrySink = (event: DatabaseTelemetryEvent) => void;

function defaultSink(event: DatabaseTelemetryEvent): void {
  if (event.name === "database.query.failed") {
    logger.error(event.name, {
      operation: "database_query",
      errorCategory: "database_error",
      retryStatus: "unknown",
      activeConnections: event.activeConnections,
      poolMax: event.poolMax,
      phase: event.phase,
      errorType: event.errorType,
    });
    logger.metric("database.error.count", { value: 1, phase: event.phase });
    return;
  }
  logger.metric(
    event.name === "database.connection.acquired"
      ? "database.connection.acquisition_ms"
      : "database.connection.active",
    event,
  );
}

function errorType(reason: unknown): string {
  return reason instanceof Error ? reason.name : "UnknownError";
}

export class DatabaseTelemetry {
  private activeConnections = 0;
  private peakActiveConnections = 0;
  private queryFailures = 0;

  constructor(
    private readonly poolMax: number,
    private readonly sink: DatabaseTelemetrySink = defaultSink,
  ) {}

  acquired(startedAt: number): void {
    this.activeConnections += 1;
    this.peakActiveConnections = Math.max(
      this.peakActiveConnections,
      this.activeConnections,
    );
    this.sink({
      name: "database.connection.acquired",
      acquisitionMs: Math.max(0, Date.now() - startedAt),
      activeConnections: this.activeConnections,
      poolMax: this.poolMax,
    });
  }

  released(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
    this.sink({
      name: "database.connection.released",
      activeConnections: this.activeConnections,
      poolMax: this.poolMax,
    });
  }

  failed(phase: "acquisition" | "query", reason: unknown): void {
    this.queryFailures += 1;
    this.sink({
      name: "database.query.failed",
      phase,
      activeConnections: this.activeConnections,
      poolMax: this.poolMax,
      errorType: errorType(reason),
    });
  }

  snapshot() {
    return {
      activeConnections: this.activeConnections,
      peakActiveConnections: this.peakActiveConnections,
      poolMax: this.poolMax,
      queryFailures: this.queryFailures,
    };
  }
}

type RejectableQuery = {
  reject: (reason: unknown) => unknown;
};

export function instrumentQueryFailure<T>(
  query: T,
  telemetry: DatabaseTelemetry,
): T {
  const rejectableQuery = query as T & RejectableQuery;
  const originalReject = rejectableQuery.reject.bind(rejectableQuery);
  rejectableQuery.reject = (reason: unknown) => {
    telemetry.failed("query", reason);
    return originalReject(reason);
  };
  return query;
}

export function instrumentDatabaseTransactions(
  database: ProjectScoutDatabase,
  telemetry: DatabaseTelemetry,
): ProjectScoutDatabase {
  return new Proxy(database, {
    get(target, property) {
      if (property !== "transaction") {
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      }

      return async (
        work: Parameters<ProjectScoutDatabase["transaction"]>[0],
        config?: Parameters<ProjectScoutDatabase["transaction"]>[1],
      ) => {
        const startedAt = Date.now();
        let acquired = false;

        try {
          return await target.transaction(async (transaction) => {
            acquired = true;
            telemetry.acquired(startedAt);
            try {
              return await work(transaction);
            } catch (reason) {
              telemetry.failed("query", reason);
              throw reason;
            } finally {
              telemetry.released();
            }
          }, config);
        } catch (reason) {
          if (!acquired) {
            telemetry.failed("acquisition", reason);
          }
          throw reason;
        }
      };
    },
  });
}
