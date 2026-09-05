"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import { LegalLinks } from "@/shared/legal/legal-links";

import { useAuth, type AuthMode } from "./auth-context";
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from "./auth-form-validation";
import { AuthSuccessIcon } from "./auth-success-icon";

type FieldErrors = Partial<Record<"email" | "password" | "confirmation", string>>;

const dialogTitles: Record<AuthMode, string> = {
  login: "Continue your research",
  signup: "Create your account",
  "forgot-password": "Reset your password",
  "check-email": "Check your email",
  "update-password": "Choose a new password",
};

function validateFields(
  mode: AuthMode,
  email: string,
  password: string,
  confirmation: string,
): FieldErrors {
  const errors: FieldErrors = {};
  if (mode !== "update-password") {
    errors.email = validateEmail(email) ?? undefined;
  }
  if (mode === "login" && !password) {
    errors.password = "Enter your password.";
  }
  if (mode === "signup" || mode === "update-password") {
    errors.password = validatePassword(password) ?? undefined;
    errors.confirmation =
      validatePasswordConfirmation(password, confirmation) ?? undefined;
  }
  return errors;
}

function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function AuthDialog() {
  const auth = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPointerDownRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (auth.isOpen && !dialog.open) {
      dialog.showModal();
    }
    if (!auth.isOpen && dialog.open) {
      dialog.close();
    }
  }, [auth.isOpen]);

  useEffect(() => {
    if (!auth.isOpen) {
      return;
    }
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousOverflow = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousOverflow;
    };
  }, [auth.isOpen]);

  function switchMode(mode: "login" | "signup" | "forgot-password") {
    auth.openAuth(mode);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateFields(auth.mode, email, password, confirmation);
    setErrors(nextErrors);
    setFormError("");
    if (hasErrors(nextErrors)) {
      return;
    }

    setLoading(true);
    const result =
      auth.mode === "login"
        ? await auth.signIn(email.trim(), password)
        : auth.mode === "signup"
          ? await auth.signUp(email.trim(), password)
          : auth.mode === "forgot-password"
            ? await auth.sendPasswordReset(email.trim())
            : await auth.updatePassword(password);
    setLoading(false);
    if (!result.ok) {
      setFormError(result.message);
    }
  }

  const dialogTitle = dialogTitles[auth.mode];
  const submitLabel = {
    login: "Log in",
    signup: "Create account",
    "forgot-password": "Send reset link",
    "update-password": "Save new password",
  } as const;

  return (
    <dialog
      className="auth-dialog"
      ref={dialogRef}
      aria-label={dialogTitle}
      onCancel={(event) => {
        event.preventDefault();
        auth.closeAuth();
      }}
      onPointerDown={(event) => {
        backdropPointerDownRef.current = event.target === event.currentTarget;
      }}
      onPointerCancel={() => {
        backdropPointerDownRef.current = false;
      }}
      onClick={(event) => {
        const startedOnBackdrop = backdropPointerDownRef.current;
        backdropPointerDownRef.current = false;
        if (startedOnBackdrop && event.target === event.currentTarget) {
          auth.closeAuth();
        }
      }}
    >
      <div className="auth-dialog__surface" data-lenis-prevent>
        <button
          className="auth-dialog__close"
          type="button"
          aria-label="Close authentication"
          onClick={auth.closeAuth}
        >
          <span aria-hidden="true">×</span>
        </button>

        {auth.mode === "login" || auth.mode === "signup" ? (
          <div className="auth-dialog__tabs" aria-label="Authentication method">
            <button
              type="button"
              aria-pressed={auth.mode === "login"}
              onClick={() => switchMode("login")}
            >
              Log in
            </button>
            <button
              type="button"
              aria-pressed={auth.mode === "signup"}
              onClick={() => switchMode("signup")}
            >
              Sign up
            </button>
          </div>
        ) : null}

        {auth.noticeMessage ? (
          <p className="auth-form__error" role="alert">{auth.noticeMessage}</p>
        ) : null}

        {auth.mode === "check-email" ? (
          <div className="auth-dialog__confirmation" role="status">
            <AuthSuccessIcon />
            <p>
              A secure link was sent to <strong>{auth.noticeEmail}</strong>.
              Open it in this browser to continue.
            </p>
            <button className="button auth-dialog__submit" type="button" onClick={auth.closeAuth}>
              Close
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {auth.mode !== "update-password" ? (
              <div className="auth-field">
                <label htmlFor="auth-email">Email address</label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby="auth-email-message"
                  autoFocus
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  onBlur={() => setErrors((current) => ({
                    ...current,
                    email: validateEmail(email) ?? undefined,
                  }))}
                />
                <p id="auth-email-message" className="auth-field__message">
                  {errors.email || "Use the address you want attached to your research."}
                </p>
              </div>
            ) : null}

            {auth.mode !== "forgot-password" ? (
              <div className="auth-field">
                <label htmlFor="auth-password">
                  {auth.mode === "update-password" ? "New password" : "Password"}
                </label>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  autoComplete={auth.mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby="auth-password-message"
                  autoFocus={auth.mode === "update-password"}
                  onChange={(event) => setPassword(event.currentTarget.value)}
                  onBlur={() => {
                    const message = auth.mode === "login"
                      ? (password ? null : "Enter your password.")
                      : validatePassword(password);
                    setErrors((current) => ({ ...current, password: message ?? undefined }));
                  }}
                />
                <p id="auth-password-message" className="auth-field__message">
                  {errors.password || (auth.mode === "login"
                    ? "Enter the password for this account."
                    : "At least 8 characters, including a letter, number, and symbol.")}
                </p>
              </div>
            ) : null}

            {auth.mode === "signup" || auth.mode === "update-password" ? (
              <div className="auth-field">
                <label htmlFor="auth-password-confirmation">Confirm password</label>
                <input
                  id="auth-password-confirmation"
                  name="passwordConfirmation"
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  aria-invalid={Boolean(errors.confirmation)}
                  aria-describedby="auth-password-confirmation-message"
                  onChange={(event) => setConfirmation(event.currentTarget.value)}
                  onBlur={() => setErrors((current) => ({
                    ...current,
                    confirmation: validatePasswordConfirmation(password, confirmation) ?? undefined,
                  }))}
                />
                <p id="auth-password-confirmation-message" className="auth-field__message">
                  {errors.confirmation || "Enter the same password again."}
                </p>
              </div>
            ) : null}

            {formError ? <p className="auth-form__error" role="alert">{formError}</p> : null}

            <button
              className="button auth-dialog__submit"
              type="submit"
              disabled={loading}
              data-state={loading ? "loading" : undefined}
            >
              {loading ? "Working…" : submitLabel[auth.mode as keyof typeof submitLabel]}
            </button>

            {auth.mode === "login" ? (
              <button className="auth-dialog__text-action" type="button" onClick={() => switchMode("forgot-password")}>
                Forgot your password?
              </button>
            ) : null}
            {auth.mode === "forgot-password" || auth.mode === "update-password" ? (
              <button className="auth-dialog__text-action" type="button" onClick={() => switchMode("login")}>
                Return to login
              </button>
            ) : null}
          </form>
        )}

        <p className="auth-dialog__legal">
          {auth.mode === "signup" ? (
            <>
              By creating an account, you agree to our{" "}
              <LegalLinks
                onNavigate={auth.closeAuth}
                order="terms-first"
                separator=" and "
              />
              .
            </>
          ) : (
            <LegalLinks onNavigate={auth.closeAuth} />
          )}
        </p>
      </div>
    </dialog>
  );
}
