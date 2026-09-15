import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/server/auth/supabase-server-client";
import { getResearchRunRepository } from "@/server/research/infrastructure/drizzle-research-run-repository";
import {
  getOrCreateVisitorSession,
  rotateCurrentVisitorSession,
} from "@/server/research/presentation/visitor-session";
import { observeRoute } from "@/server/observability/observe-route";
import { logger, setObservedUser } from "@/server/observability/structured-logger";

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
    await rotateCurrentVisitorSession();
  } catch (reason) {
    logger.error("auth.confirm_claim.failed", {
      operation: "confirm_auth_and_claim_research",
      userId,
      errorCategory: "persistence_failure",
      retryStatus: "retryable",
    }, reason);
  }
}

async function confirmAuth(request: NextRequest): Promise<NextResponse> {
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
      logger.warn("auth.confirm.failed", {
        operation: "verify_otp",
        provider: "supabase",
        errorCategory: "authentication_failure",
        retryStatus: "retryable",
      });
      return NextResponse.redirect(failureUrl);
    }
    userId = data.user?.id;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logger.warn("auth.confirm.failed", {
        operation: "exchange_code",
        provider: "supabase",
        errorCategory: "authentication_failure",
        retryStatus: "retryable",
      });
      return NextResponse.redirect(failureUrl);
    }
    userId = data.user?.id;
  } else {
    return NextResponse.redirect(failureUrl);
  }

  if (userId) {
    setObservedUser(userId);
    await attachAnonymousRuns(userId);
  }

  const destination = recovery
    ? "/?auth=update-password"
    : "/research?auth=confirmed";
  return NextResponse.redirect(new URL(destination, request.url));
}

export const GET = observeRoute(
  "/auth/confirm",
  (request) => confirmAuth(request as NextRequest),
);
