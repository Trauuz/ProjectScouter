export type ProviderOperation = "research" | "recommendation";
export type ProviderCallStatus =
  | "pending"
  | "completed"
  | "failed"
  | "timed_out"
  | "cancelled";

export type ProviderCallContext = Readonly<{
  internalRequestId: string;
  idempotencyKey: string;
  usageReservationId?: string;
  userId: string | null;
  retryCount: number;
}>;

export type ProviderUsageMeasurement = Readonly<{
  providerRequestId?: string;
  inputTokens: number;
  outputTokens: number;
  credits: number;
}>;

export type MeteredProviderResult<Value> = Readonly<{
  value: Value;
  usage: ProviderUsageMeasurement;
}>;

export type ProviderPricing = Readonly<{
  requestMicrodollars: number;
  inputMicrodollarsPerMillionTokens: number;
  outputMicrodollarsPerMillionTokens: number;
  microdollarsPerCredit: number;
}>;

export type ProviderUsageSummary = Readonly<{
  period: "day" | "month";
  periodStart: string;
  periodEnd: string;
  requestCount: number;
  completedCount: number;
  failedCount: number;
  inputTokens: number;
  outputTokens: number;
  credits: number;
  estimatedCostMicrodollars: number;
  byProvider: ReadonlyArray<Readonly<{
    provider: string;
    requestCount: number;
    completedCount: number;
    failedCount: number;
    inputTokens: number;
    outputTokens: number;
    credits: number;
    estimatedCostMicrodollars: number;
  }>>;
}>;
