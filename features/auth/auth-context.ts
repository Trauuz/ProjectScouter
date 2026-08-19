"use client";

import { createContext, useContext } from "react";

import type { AuthIdentity } from "@/shared/auth/auth-identity";

import type { NewPendingAuthIntent } from "./pending-auth-intent-store";

export type AuthMode =
  | "login"
  | "signup"
  | "forgot-password"
  | "check-email"
  | "update-password";

export type AuthActionResult =
  | { ok: true }
  | { ok: false; message: string };

export type AuthContextValue = {
  user: AuthIdentity | null;
  ready: boolean;
  isOpen: boolean;
  mode: AuthMode;
  noticeEmail: string;
  noticeMessage: string;
  openAuth: (mode?: AuthMode, intent?: NewPendingAuthIntent) => void;
  closeAuth: () => void;
  requireAuth: (
    intent: NewPendingAuthIntent,
    preferredMode?: "login" | "signup",
  ) => boolean;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string) => Promise<AuthActionResult>;
  sendPasswordReset: (email: string) => Promise<AuthActionResult>;
  updatePassword: (password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return value;
}
