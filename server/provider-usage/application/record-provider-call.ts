import { ResearchFailure } from "../../research/application/research-errors";
import type {
  MeteredProviderResult,
  ProviderCallContext,
  ProviderCallStatus,
  ProviderOperation,
  ProviderPricing,
  ProviderUsageMeasurement,
  ProviderUsageSummary,
} from "../domain/provider-usage";

export type ProviderUsageLedger = {
  begin(input: Readonly<{
    internalRequestId: string;
    idempotencyKey: string;
    usageReservationId?: string;
    userId: string | null;
    provider: string;
    operation: ProviderOperation;
    modelOrMode: string;
    retryCount: number;
    startedAt: Date;
  }>): Promise<{ id: string; status: ProviderCallStatus; created?: boolean }>;
  complete(id: string, input: Readonly<{
    completedAt: Date;
    providerRequestId?: string;
    inputTokens: number;
    outputTokens: number;
    credits: number;
    estimatedCostMicrodollars: number;
  }>): Promise<void>;
  fail(id: string, input: Readonly<{
    completedAt: Date;
    status: Exclude<ProviderCallStatus, "pending" | "completed">;
  }>): Promise<void>;
  isReservationReconciled(reservationId: string): Promise<boolean>;
  summarize(
    period: "day" | "month",
    now?: Date,
    operation?: ProviderOperation,
  ): Promise<ProviderUsageSummary>;
};

type Descriptor = Readonly<{
  provider: string;
  operation: ProviderOperation;
  modelOrMode: string;
  pricing: ProviderPricing;
}>;

type CompletionMonitor = {
  checkAfterCompletion(
    provider: string,
    operation: ProviderOperation,
  ): Promise<void>;
};

function estimatedCost(
  measurement: ProviderUsageMeasurement,
  pricing: ProviderPricing,
): number {
  const input = Math.ceil(
    measurement.inputTokens * pricing.inputMicrodollarsPerMillionTokens /
      1_000_000,
  );
  const output = Math.ceil(
    measurement.outputTokens * pricing.outputMicrodollarsPerMillionTokens /
      1_000_000,
  );
  const credits = Math.ceil(
    measurement.credits * pricing.microdollarsPerCredit,
  );
  return pricing.requestMicrodollars + input + output + credits;
}

function failureStatus(reason: unknown): "failed" | "timed_out" | "cancelled" {
  if (reason instanceof ResearchFailure && reason.code === "UPSTREAM_TIMEOUT") {
    return "timed_out";
  }
  if (reason instanceof DOMException && reason.name === "AbortError") {
    return "cancelled";
  }
  return "failed";
}

export class RecordProviderCall {
  constructor(
    private readonly ledger: ProviderUsageLedger,
    private readonly descriptor: Descriptor,
    private readonly now: () => Date = () => new Date(),
    private readonly monitor?: CompletionMonitor,
  ) {}

  async run<Value>(
    context: ProviderCallContext,
    call: () => Promise<MeteredProviderResult<Value>>,
  ): Promise<Value> {
    const record = await this.ledger.begin({
      ...context,
      provider: this.descriptor.provider,
      operation: this.descriptor.operation,
      modelOrMode: this.descriptor.modelOrMode,
      startedAt: this.now(),
    });
    if (record.created === false) {
      throw new ResearchFailure(
        "UPSTREAM_FAILED",
        "A duplicate provider operation was suppressed.",
      );
    }

    let result: MeteredProviderResult<Value>;
    try {
      result = await call();
    } catch (reason) {
      await this.ledger.fail(record.id, {
        completedAt: this.now(),
        status: failureStatus(reason),
      });
      throw reason;
    }

    await this.ledger.complete(record.id, {
      completedAt: this.now(),
      ...result.usage,
      estimatedCostMicrodollars: estimatedCost(
        result.usage,
        this.descriptor.pricing,
      ),
    });
    await this.monitor
      ?.checkAfterCompletion(
        this.descriptor.provider,
        this.descriptor.operation,
      )
      .catch(() => undefined);
    return result.value;
  }
}
