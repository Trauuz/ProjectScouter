"use client";

import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createAuthIdentity, type AuthIdentity } from "@/shared/auth/auth-identity";

import { AuthContext, type AuthActionResult, type AuthMode } from "./auth-context";
import { AuthDialog } from "./auth-dialog";
import { reportAuthFailure, toAuthFailure } from "./auth-errors";
import {
  createPendingAuthIntentStore,
  type NewPendingAuthIntent,
} from "./pending-auth-intent-store";
import { getSupabaseBrowserClient } from "./supabase-browser-client";

function identityFromUser(
  user: { id: string; email?: string | null } | null,
): AuthIdentity | null {
  return user ? createAuthIdentity(user.id, user.email) : null;
}

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: AuthIdentity | null;
}) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [ready, setReady] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [noticeEmail, setNoticeEmail] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const resumedIntentRef = useRef<string | null>(null);
  const recoveryModeRef = useRef(false);

  const pendingStore = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return createPendingAuthIntentStore();
  }, []);

  const resumePendingIntent = useCallback(() => {
    const intent = pendingStore?.peek();
    if (!intent || resumedIntentRef.current === intent.id) {
      return;
    }

    resumedIntentRef.current = intent.id;
    void fetch("/api/auth/claim-runs", { method: "POST" }).catch(() => undefined);
    router.replace(`/research?resume=${encodeURIComponent(intent.id)}`);
  }, [pendingStore, router]);

  const finishAuthentication = useCallback(
    (authenticatedUser: { id: string; email?: string } | null) => {
      const identity = identityFromUser(authenticatedUser);
      setUser(identity);
      setIsOpen(false);
      if (identity && !recoveryModeRef.current) {
        resumePendingIntent();
      }
    },
    [resumePendingIntent],
  );

  useEffect(() => {
    let supabase: ReturnType<typeof getSupabaseBrowserClient>;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const queryTimer = window.setTimeout(() => {
      if (query.get("auth") === "update-password") {
        recoveryModeRef.current = true;
        setMode("update-password");
        setIsOpen(true);
      } else if (query.get("auth") === "confirmation-error") {
        setNoticeMessage(
          "That email link is invalid or has expired. Request a new link and try again.",
        );
        setMode("login");
        setIsOpen(true);
      }
    }, 0);

    void supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      const identity = identityFromUser(data.user);
      setUser(identity);
      setReady(true);
      if (identity && !recoveryModeRef.current) {
        resumePendingIntent();
      }
    });

    const { data } = supabase.auth.onAuthStateChange((
      event: AuthChangeEvent,
      session: Session | null,
    ) => {
      const identity = identityFromUser(session?.user ?? null);
      setUser(identity);

      if (event === "PASSWORD_RECOVERY") {
        recoveryModeRef.current = true;
        setMode("update-password");
        setIsOpen(true);
        return;
      }

      if (event === "SIGNED_IN" && identity && !recoveryModeRef.current) {
        setIsOpen(false);
        resumePendingIntent();
      }
    });

    return () => {
      window.clearTimeout(queryTimer);
      data.subscription.unsubscribe();
    };
  }, [resumePendingIntent]);

  const openAuth = useCallback(
    (nextMode: AuthMode = "login", intent?: NewPendingAuthIntent) => {
      if (intent) {
        pendingStore?.save(intent);
        resumedIntentRef.current = null;
      }
      setNoticeMessage("");
      setMode(nextMode);
      setIsOpen(true);
    },
    [pendingStore],
  );

  const closeAuth = useCallback(() => {
    pendingStore?.clearPending();
    setIsOpen(false);
  }, [pendingStore]);

  const requireAuth = useCallback(
    (intent: NewPendingAuthIntent, preferredMode: "login" | "signup" = "login") => {
      if (user) {
        return true;
      }
      openAuth(preferredMode, intent);
      return false;
    },
    [openAuth, user],
  );

  const signIn = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      finishAuthentication(data.user);
      return { ok: true };
    } catch (reason) {
      reportAuthFailure("login", reason);
      return { ok: false, message: toAuthFailure(reason).message };
    }
  }, [finishAuthentication]);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      });
      if (error) {
        throw error;
      }
      if (data.session) {
        finishAuthentication(data.user);
        return { ok: true };
      }

      const intent = pendingStore?.peek();
      if (intent) {
        pendingStore?.markAwaitingConfirmation(intent.id);
      }
      setNoticeEmail(email);
      setMode("check-email");
      return { ok: true };
    } catch (reason) {
      reportAuthFailure("signup", reason);
      return { ok: false, message: toAuthFailure(reason).message };
    }
  }, [finishAuthentication, pendingStore]);

  const sendPasswordReset = useCallback(async (email: string): Promise<AuthActionResult> => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm?recovery=1`,
      });
      if (error) {
        throw error;
      }
      setNoticeEmail(email);
      setMode("check-email");
      return { ok: true };
    } catch (reason) {
      reportAuthFailure("password-reset", reason);
      return { ok: false, message: toAuthFailure(reason).message };
    }
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<AuthActionResult> => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }
      recoveryModeRef.current = false;
      setIsOpen(false);
      router.replace(window.location.pathname);
      resumePendingIntent();
      return { ok: true };
    } catch (reason) {
      reportAuthFailure("password-update", reason);
      return { ok: false, message: toAuthFailure(reason).message };
    }
  }, [resumePendingIntent, router]);

  const signOut = useCallback(async () => {
    try {
      await getSupabaseBrowserClient().auth.signOut();
    } finally {
      pendingStore?.clearPending();
      setUser(null);
      router.replace("/");
    }
  }, [pendingStore, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        isOpen,
        mode,
        noticeEmail,
        noticeMessage,
        openAuth,
        closeAuth,
        requireAuth,
        signIn,
        signUp,
        sendPasswordReset,
        updatePassword,
        signOut,
      }}
    >
      {children}
      <AuthDialog key={mode} />
    </AuthContext.Provider>
  );
}
