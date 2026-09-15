import "server-only";

import { createClient } from "@supabase/supabase-js";

import { readSupabaseAdminEnvironment } from "./supabase-admin-environment";

export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = readSupabaseAdminEnvironment();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
