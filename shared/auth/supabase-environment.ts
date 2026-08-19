export type SupabasePublicEnvironment = {
  url: string;
  publishableKey: string;
};

export function readSupabasePublicEnvironment(): SupabasePublicEnvironment | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  try {
    return { url: new URL(url).toString(), publishableKey };
  } catch {
    return null;
  }
}

