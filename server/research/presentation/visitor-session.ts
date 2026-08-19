import { cookies } from "next/headers";

import { VisitorSessionId } from "../domain/research-owner";

export const RESEARCH_VISITOR_COOKIE = "projectscout_visitor_id";
const VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

type VisitorCookieStore = {
  get(name: string): { value: string } | undefined;
  set(
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      sameSite: "lax";
      secure: boolean;
      path: string;
      maxAge: number;
      priority: "high";
    },
  ): void;
};

export function resolveVisitorSession(
  cookieStore: VisitorCookieStore,
  secure: boolean,
): VisitorSessionId {
  const existing = VisitorSessionId.tryCreate(
    cookieStore.get(RESEARCH_VISITOR_COOKIE)?.value,
  );

  if (existing) {
    return existing;
  }

  const generated = VisitorSessionId.generate();
  cookieStore.set(RESEARCH_VISITOR_COOKIE, generated.toString(), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: VISITOR_COOKIE_MAX_AGE_SECONDS,
    priority: "high",
  });
  return generated;
}

export async function getOrCreateVisitorSession(): Promise<VisitorSessionId> {
  const cookieStore = await cookies();
  return resolveVisitorSession(cookieStore, process.env.NODE_ENV === "production");
}
