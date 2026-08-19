"use client";

import { createBrowserClient } from "@supabase/ssr";

import { readSupabasePublicEnvironment } from "@/shared/auth/supabase-environment";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const environment = readSupabasePublicEnvironment();
  if (!environment) {
    throw new Error("SUPABASE_AUTH_NOT_CONFIGURED");
  }

  browserClient = createBrowserClient(
    environment.url,
    environment.publishableKey,
  );
  return browserClient;
}

