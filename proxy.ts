import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { readSupabasePublicEnvironment } from "@/shared/auth/supabase-environment";
import {
  applyBrowserSecurityHeaders,
  createBrowserSecurityPolicy,
  type BrowserSecurityEnvironment,
} from "@/server/security/browser-security-policy";

function runtimeEnvironment(): BrowserSecurityEnvironment {
  if (process.env.NODE_ENV === "development") {
    return "development";
  }
  if (process.env.NODE_ENV === "production") {
    return "production";
  }
  return "test";
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const environment = readSupabasePublicEnvironment();
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const securityPolicy = createBrowserSecurityPolicy({
    nonce,
    supabaseUrl: environment?.url,
    environment: runtimeEnvironment(),
  });
  const nextResponse = () => {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set(
      "Content-Security-Policy",
      securityPolicy.contentSecurityPolicy,
    );
    return NextResponse.next({ request: { headers: requestHeaders } });
  };

  let response = nextResponse();

  if (environment) {
    const supabase = createServerClient(
      environment.url,
      environment.publishableKey,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            for (const { name, value } of cookiesToSet) {
              request.cookies.set(name, value);
            }
            response = nextResponse();
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
      },
    );

    await supabase.auth.getClaims();
  }

  applyBrowserSecurityHeaders(response.headers, securityPolicy);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
