import "server-only";

export {
  AccountDeletionConfigurationError,
  type SupabaseAdminEnvironment,
  type SupabaseServiceRoleKey,
} from "./supabase-admin-environment-schema";
import { parseSupabaseAdminEnvironment } from "./supabase-admin-environment-schema";

export function readSupabaseAdminEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
) {
  return parseSupabaseAdminEnvironment(source);
}
