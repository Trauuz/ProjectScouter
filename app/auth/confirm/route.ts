import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/server/auth/supabase-server-client";
import { getResearchRunRepository } from "@/server/research/infrastructure/drizzle-research-run-repository";
import { getOrCreateVisitorSession } from "@/server/research/presentation/visitor-session";

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
]);

async function attachAnonymousRuns(userId: string): Promise<void> {
  try {
    const sessionId = await getOrCreateVisitorSession();
    await getResearchRunRepository().attachResearchRunsToUser(sessionId, userId);
  } catch (reason) {
    console.error("[auth-confirm] Could not attach anonymous research runs", reason);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const failureUrl = new URL("/?auth=confirmation-error", request.url);
  if (!supabase) {
    return NextResponse.redirect(failureUrl);
  }

  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const typeValue = request.nextUrl.searchParams.get("type");
  const code = request.nextUrl.searchParams.get("code");
  const recovery =
    typeValue === "recovery" ||
    request.nextUrl.searchParams.get("recovery") === "1";

  let userId: string | undefined;
  if (
    tokenHash &&
    typeValue &&
    EMAIL_OTP_TYPES.has(typeValue as EmailOtpType)
  ) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: typeValue as EmailOtpType,
    });
    if (error) {
      return NextResponse.redirect(failureUrl);
    }
    userId = data.user?.id;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(failureUrl);
    }
    userId = data.user?.id;
  } else {
    return NextResponse.redirect(failureUrl);
  }

  if (userId) {
    await attachAnonymousRuns(userId);
  }

  const destination = recovery
    ? "/?auth=update-password"
    : "/research?auth=confirmed";
  return NextResponse.redirect(new URL(destination, request.url));
}
