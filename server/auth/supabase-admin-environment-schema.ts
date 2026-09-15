import "server-only";

const SUPABASE_SERVICE_ROLE_KEY = "SUPABASE_SERVICE_ROLE_KEY" as const;
const NEXT_PUBLIC_SUPABASE_URL = "NEXT_PUBLIC_SUPABASE_URL" as const;

declare const serviceRoleKeyBrand: unique symbol;

export type SupabaseServiceRoleKey = string & {
  readonly [serviceRoleKeyBrand]: "SupabaseServiceRoleKey";
};

export type SupabaseAdminEnvironment = Readonly<{
  url: string;
  serviceRoleKey: SupabaseServiceRoleKey;
}>;

export type SupabaseAdminVariableName =
  | typeof NEXT_PUBLIC_SUPABASE_URL
  | typeof SUPABASE_SERVICE_ROLE_KEY;

export class AccountDeletionConfigurationError extends Error {
  readonly code = "ACCOUNT_DELETION_CONFIGURATION_INVALID";

  constructor(readonly variableNames: readonly SupabaseAdminVariableName[]) {
    super(
      `Account deletion configuration error: ${variableNames.join(", ")} is missing or invalid.`,
    );
    this.name = "AccountDeletionConfigurationError";
  }
}

function validSupabaseUrl(candidate: string | undefined): candidate is string {
  if (!candidate) {
    return false;
  }

  try {
    return new URL(candidate).protocol === "https:";
  } catch {
    return false;
  }
}

function jwtHasServiceRole(candidate: string): boolean {
  const payload = candidate.split(".")[1];
  if (!payload) {
    return false;
  }

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { role?: unknown };
    return claims.role === "service_role";
  } catch {
    return false;
  }
}

function validServiceRoleKey(candidate: string | undefined): candidate is string {
  if (!candidate || candidate.length < 20) {
    return false;
  }

  return candidate.startsWith("sb_secret_") || jwtHasServiceRole(candidate);
}

export function parseSupabaseAdminEnvironment(
  source: Readonly<Record<string, string | undefined>>,
): SupabaseAdminEnvironment {
  const url = source.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = source.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const invalid: SupabaseAdminVariableName[] = [];

  if (!validSupabaseUrl(url)) {
    invalid.push(NEXT_PUBLIC_SUPABASE_URL);
  }
  if (!validServiceRoleKey(serviceRoleKey)) {
    invalid.push(SUPABASE_SERVICE_ROLE_KEY);
  }
  if (invalid.length > 0) {
    throw new AccountDeletionConfigurationError(invalid);
  }

  return {
    url: url as string,
    serviceRoleKey: serviceRoleKey as SupabaseServiceRoleKey,
  };
}
