"use client";

import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createAuthIdentity, type AuthIdentity } from "@/shared/auth/auth-identity";

import { AuthContext, type AuthActionResult, type AuthMode } from "./auth-context";
import { completeAccountDeletion } from "./account-deletion-client";
import { clearBrowserAccountData } from "./account-local-data";
import { consumeAuthCallback } from "./auth-callback";
import { AuthDialog } from "./auth-dialog";
import { reportAuthFailure, toAuthFailure } from "./auth-errors";
import {
  loginFailureResponse,
  passwordResetResponse,
  signupResponse,
} from "./auth-response-policy";
import {
  createPendingAuthIntentStore,
  type NewPendingAuthIntent,
} from "./pending-auth-intent-store";
import { completeSignOut } from "./sign-out";
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
  const [checkEmailMessage, setCheckEmailMessage] = useState("");
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

    const callback = consumeAuthCallback(
      window.location.pathname,
      new URLSearchParams(window.location.search),
    );
    const queryTimer = window.setTimeout(() => {
      if (!callback) {
        return;
      }

      window.history.replaceState(window.history.state, "", callback.cleanUrl);
      if (callback.state === "update-password") {
        recoveryModeRef.current = true;
        setMode("update-password");
        setIsOpen(true);
      } else if (callback.state === "confirmation-error") {
        setNoticeMessage(
          "That email link is invalid or has expired. Request a new link and try again.",
        );
        setMode("login");
        setIsOpen(true);
      } else if (callback.state === "email-confirmed") {
        setNoticeMessage("");
        setMode("email-confirmed");
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
      return { ok: false, message: loginFailureResponse(reason).message };
    }
  }, [finishAuthentication]);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    const showCheckEmail = () => {
      const intent = pendingStore?.peek();
      if (intent) {
        pendingStore?.markAwaitingConfirmation(intent.id);
      }
      setCheckEmailMessage(signupResponse().message);
      setMode("check-email");
    };

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      });
      if (error) {
        throw error;
      }
      showCheckEmail();
      return { ok: true };
    } catch (reason) {
      reportAuthFailure("signup", reason);
      const response = signupResponse(reason);
      if (response.kind === "check_email") {
        showCheckEmail();
        return { ok: true };
      }
      return { ok: false, message: response.message };
    }
  }, [pendingStore]);

  const sendPasswordReset = useCallback(async (email: string): Promise<AuthActionResult> => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm?recovery=1`,
      });
      if (error) {
        throw error;
      }
      setCheckEmailMessage(passwordResetResponse().message);
      setMode("check-email");
      return { ok: true };
    } catch (reason) {
      reportAuthFailure("password-reset", reason);
      const response = passwordResetResponse(reason);
      if (response.kind === "check_email") {
        setCheckEmailMessage(response.message);
        setMode("check-email");
        return { ok: true };
      }
      return { ok: false, message: response.message };
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

  const signOut = useCallback(() => {
    return completeSignOut({
      revoke: (options) => getSupabaseBrowserClient().auth.signOut(options),
      onRevoked: () => {
        pendingStore?.clearPending();
        setUser(null);
        router.replace("/");
        router.refresh();
      },
      onFailure: (reason) => reportAuthFailure("logout", reason),
    });
  }, [pendingStore, router]);

  const deleteAccount = useCallback((): Promise<AuthActionResult> => {
    return completeAccountDeletion({
      deleteFromServer: () => fetch("/api/account", { method: "DELETE" }),
      clearLocalAccountData: clearBrowserAccountData,
      revokeLocalSession: () =>
        getSupabaseBrowserClient().auth.signOut({ scope: "local" }),
      onDeleted: () => {
        setUser(null);
        router.replace("/");
        router.refresh();
      },
      onFailure: (reason) => reportAuthFailure("account-deletion", reason),
      onLocalCleanupFailure: (reason) =>
        reportAuthFailure("account-deletion-local-cleanup", reason),
      onSessionCleanupFailure: (reason) =>
        reportAuthFailure("account-deletion-session-cleanup", reason),
    });
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        isOpen,
        mode,
        checkEmailMessage,
        noticeMessage,
        openAuth,
        closeAuth,
        requireAuth,
        signIn,
        signUp,
        sendPasswordReset,
        updatePassword,
        signOut,
        deleteAccount,
      }}
    >
      {children}
      <AuthDialog key={mode} />
    </AuthContext.Provider>
  );
}
