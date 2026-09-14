import "server-only";

import { createAuthIdentity, type AuthIdentity } from "@/shared/auth/auth-identity";

import { canRunResearch } from "./account-deletion-service";
import { createSupabaseServerClient } from "./supabase-server-client";

export async function getOptionalAuthIdentity(): Promise<AuthIdentity | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims?.sub) {
      return null;
    }

    const email =
      typeof data.claims.email === "string" ? data.claims.email : undefined;
    return createAuthIdentity(data.claims.sub, email);
  } catch {
    return null;
  }
}

export async function getActiveAuthIdentity(): Promise<AuthIdentity | null> {
  const identity = await getOptionalAuthIdentity();
  if (!identity) {
    return null;
  }

  try {
    return await canRunResearch(identity.id) ? identity : null;
  } catch {
    return null;
  }
}
