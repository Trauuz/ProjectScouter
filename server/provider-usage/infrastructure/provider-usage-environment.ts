import { z } from "zod";

const variableNames = [
  "ACCOUNT_MONTHLY_RESEARCH_LIMIT",
  "RESEARCH_PROVIDER_MONTHLY_CREDIT_CEILING",
  "RESEARCH_PROVIDER_CREDITS_PER_CALL",
  "RECOMMENDATION_PROVIDER_DAILY_CALL_CEILING",
  "PROVIDER_USAGE_WARNING_PERCENT",
  "PROVIDER_DAILY_SPEND_CEILING_MICRODOLLARS",
  "PROVIDER_MONTHLY_SPEND_CEILING_MICRODOLLARS",
  "RESEARCH_PROVIDER_REQUEST_MICRODOLLARS",
  "RESEARCH_PROVIDER_INPUT_MICRODOLLARS_PER_MILLION_TOKENS",
  "RESEARCH_PROVIDER_OUTPUT_MICRODOLLARS_PER_MILLION_TOKENS",
  "RESEARCH_PROVIDER_MICRODOLLARS_PER_CREDIT",
  "RECOMMENDATION_PROVIDER_REQUEST_MICRODOLLARS",
  "RECOMMENDATION_PROVIDER_INPUT_MICRODOLLARS_PER_MILLION_TOKENS",
  "RECOMMENDATION_PROVIDER_OUTPUT_MICRODOLLARS_PER_MILLION_TOKENS",
  "RECOMMENDATION_PROVIDER_MICRODOLLARS_PER_CREDIT",
] as const;

type VariableName = (typeof variableNames)[number];

const positiveInteger = z.coerce.number().int().positive();
const nonnegativeInteger = z.coerce.number().int().nonnegative();

const schema = z.object({
  ACCOUNT_MONTHLY_RESEARCH_LIMIT: positiveInteger,
  RESEARCH_PROVIDER_MONTHLY_CREDIT_CEILING: positiveInteger,
  RESEARCH_PROVIDER_CREDITS_PER_CALL: positiveInteger,
  RECOMMENDATION_PROVIDER_DAILY_CALL_CEILING: positiveInteger,
  PROVIDER_USAGE_WARNING_PERCENT: z.coerce.number().int().min(1).max(99),
  PROVIDER_DAILY_SPEND_CEILING_MICRODOLLARS: positiveInteger,
  PROVIDER_MONTHLY_SPEND_CEILING_MICRODOLLARS: positiveInteger,
  RESEARCH_PROVIDER_REQUEST_MICRODOLLARS: nonnegativeInteger,
  RESEARCH_PROVIDER_INPUT_MICRODOLLARS_PER_MILLION_TOKENS: nonnegativeInteger,
  RESEARCH_PROVIDER_OUTPUT_MICRODOLLARS_PER_MILLION_TOKENS: nonnegativeInteger,
  RESEARCH_PROVIDER_MICRODOLLARS_PER_CREDIT: nonnegativeInteger,
  RECOMMENDATION_PROVIDER_REQUEST_MICRODOLLARS: nonnegativeInteger,
  RECOMMENDATION_PROVIDER_INPUT_MICRODOLLARS_PER_MILLION_TOKENS:
    nonnegativeInteger,
  RECOMMENDATION_PROVIDER_OUTPUT_MICRODOLLARS_PER_MILLION_TOKENS:
    nonnegativeInteger,
  RECOMMENDATION_PROVIDER_MICRODOLLARS_PER_CREDIT: nonnegativeInteger,
}).superRefine((value, context) => {
  if (
    value.PROVIDER_MONTHLY_SPEND_CEILING_MICRODOLLARS <
    value.PROVIDER_DAILY_SPEND_CEILING_MICRODOLLARS
  ) {
    context.addIssue({
      code: "custom",
      path: ["PROVIDER_MONTHLY_SPEND_CEILING_MICRODOLLARS"],
      message: "Monthly spend ceiling must be at least the daily spend ceiling.",
    });
  }
  if (
    value.RESEARCH_PROVIDER_CREDITS_PER_CALL >
    value.RESEARCH_PROVIDER_MONTHLY_CREDIT_CEILING
  ) {
    context.addIssue({
      code: "custom",
      path: ["RESEARCH_PROVIDER_CREDITS_PER_CALL"],
      message: "Credits per call cannot exceed the monthly credit ceiling.",
    });
  }
});

export class ProviderUsageConfigurationError extends Error {
  readonly code = "PROVIDER_USAGE_CONFIGURATION_INVALID";

  constructor(
    readonly variableNames: readonly VariableName[],
    details: readonly string[] = [],
  ) {
    super(
      [
        `Provider usage configuration is missing or invalid: ${variableNames.join(", ")}.`,
        ...details,
      ].join(" "),
    );
    this.name = "ProviderUsageConfigurationError";
  }
}

export function readProviderUsageEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const invalid = new Set(
      result.error.issues
        .map((issue) => issue.path[0])
        .filter((name): name is VariableName =>
          typeof name === "string" && variableNames.includes(name as VariableName),
        ),
    );
    throw new ProviderUsageConfigurationError(
      variableNames.filter((name) => invalid.has(name)),
      result.error.issues
        .map((issue) => issue.message)
        .filter((message) => message !== "Invalid input: expected number, received NaN"),
    );
  }

  const value = result.data;
  return {
    limits: {
      accountMonthlyResearch: value.ACCOUNT_MONTHLY_RESEARCH_LIMIT,
      researchMonthlyCredits:
        value.RESEARCH_PROVIDER_MONTHLY_CREDIT_CEILING,
      researchCreditsPerCall: value.RESEARCH_PROVIDER_CREDITS_PER_CALL,
      recommendationDailyCalls:
        value.RECOMMENDATION_PROVIDER_DAILY_CALL_CEILING,
    },
    alerts: {
      warningFraction: value.PROVIDER_USAGE_WARNING_PERCENT / 100,
      dailySpendCeilingMicrodollars:
        value.PROVIDER_DAILY_SPEND_CEILING_MICRODOLLARS,
      monthlySpendCeilingMicrodollars:
        value.PROVIDER_MONTHLY_SPEND_CEILING_MICRODOLLARS,
    },
    pricing: {
      research: {
        requestMicrodollars: value.RESEARCH_PROVIDER_REQUEST_MICRODOLLARS,
        inputMicrodollarsPerMillionTokens:
          value.RESEARCH_PROVIDER_INPUT_MICRODOLLARS_PER_MILLION_TOKENS,
        outputMicrodollarsPerMillionTokens:
          value.RESEARCH_PROVIDER_OUTPUT_MICRODOLLARS_PER_MILLION_TOKENS,
        microdollarsPerCredit:
          value.RESEARCH_PROVIDER_MICRODOLLARS_PER_CREDIT,
      },
      recommendation: {
        requestMicrodollars:
          value.RECOMMENDATION_PROVIDER_REQUEST_MICRODOLLARS,
        inputMicrodollarsPerMillionTokens:
          value.RECOMMENDATION_PROVIDER_INPUT_MICRODOLLARS_PER_MILLION_TOKENS,
        outputMicrodollarsPerMillionTokens:
          value.RECOMMENDATION_PROVIDER_OUTPUT_MICRODOLLARS_PER_MILLION_TOKENS,
        microdollarsPerCredit:
          value.RECOMMENDATION_PROVIDER_MICRODOLLARS_PER_CREDIT,
      },
    },
  };
}

export const PROVIDER_USAGE_VARIABLE_NAMES = variableNames;
