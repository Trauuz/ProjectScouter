import "server-only";

import {
  AccountDeletionConfigurationError,
  parseSupabaseAdminEnvironment,
} from "../auth/supabase-admin-environment-schema";
import {
  DatabaseConfigurationError,
  readDatabaseEnvironment,
} from "../database/database-environment";

const CHECKED_VARIABLES = [
  "DATABASE_URL",
  "DATABASE_CONNECTION_MODE",
  "DATABASE_RUNTIME",
  "DATABASE_POOL_MAX",
  "DATABASE_CONNECT_TIMEOUT_SECONDS",
  "DATABASE_IDLE_TIMEOUT_SECONDS",
  "DATABASE_MAX_LIFETIME_SECONDS",
  "DATABASE_SHUTDOWN_TIMEOUT_SECONDS",
  "DATABASE_CONNECTION_BUDGET",
  "DATABASE_MAX_APP_INSTANCES",
  "DATABASE_RESERVED_CONNECTIONS",
  "DATABASE_SSL_MODE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ACCOUNT_DELETION_WORKER_SECRET",
  "RESEARCH_API_KEY",
  "RECOMMENDATION_API_KEY",
  "RECOMMENDATION_MODEL",
] as const;

type ProductionVariableName = (typeof CHECKED_VARIABLES)[number];

export class DeploymentConfigurationError extends Error {
  readonly code = "PRODUCTION_CONFIGURATION_INVALID";

  constructor(readonly variableNames: readonly ProductionVariableName[]) {
    super(
      `Production configuration is missing or invalid: ${variableNames.join(", ")}.`,
    );
    this.name = "DeploymentConfigurationError";
  }
}

function nonEmpty(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function validDatabaseUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    return ["postgres:", "postgresql:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function validateProductionEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
) {
  const invalid = new Set<ProductionVariableName>();

  for (const variableName of CHECKED_VARIABLES.slice(0, 12)) {
    if (!nonEmpty(source[variableName])) {
      invalid.add(variableName);
    }
  }
  if (!validDatabaseUrl(source.DATABASE_URL?.trim())) {
    invalid.add("DATABASE_URL");
  }
  try {
    readDatabaseEnvironment(source);
  } catch (reason) {
    if (reason instanceof DatabaseConfigurationError) {
      for (const variableName of reason.variableNames) {
        invalid.add(variableName);
      }
    } else {
      invalid.add("DATABASE_URL");
    }
  }
  if (!nonEmpty(source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
    invalid.add("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  if ((source.ACCOUNT_DELETION_WORKER_SECRET?.trim().length ?? 0) < 32) {
    invalid.add("ACCOUNT_DELETION_WORKER_SECRET");
  }
  for (const variableName of [
    "RESEARCH_API_KEY",
    "RECOMMENDATION_API_KEY",
    "RECOMMENDATION_MODEL",
  ] as const) {
    if (!nonEmpty(source[variableName])) {
      invalid.add(variableName);
    }
  }

  try {
    parseSupabaseAdminEnvironment(source);
  } catch (reason) {
    if (reason instanceof AccountDeletionConfigurationError) {
      for (const variableName of reason.variableNames) {
        invalid.add(variableName);
      }
    } else {
      invalid.add("SUPABASE_SERVICE_ROLE_KEY");
    }
  }

  if (invalid.size > 0) {
    throw new DeploymentConfigurationError(
      CHECKED_VARIABLES.filter((name) => invalid.has(name)),
    );
  }

  return { valid: true as const, checkedVariables: [...CHECKED_VARIABLES] };
}
