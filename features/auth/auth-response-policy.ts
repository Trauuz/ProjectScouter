import { authErrorCode, toAuthFailure } from "./auth-errors";

export const LOGIN_FAILURE_MESSAGE =
  "Login could not be completed. Check your email and password, or request a password reset.";
export const SIGNUP_CHECK_EMAIL_MESSAGE =
  "If this address is eligible, you’ll receive an email shortly.";
export const PASSWORD_RESET_CHECK_EMAIL_MESSAGE =
  "If an account is associated with this address, you’ll receive a password reset email shortly.";

type AuthPublicResponse =
  | { kind: "check_email"; message: string }
  | { kind: "failure"; message: string };

const hiddenSignupCodes = new Set(["email_exists", "user_already_exists"]);

export function loginFailureResponse(reason: unknown): AuthPublicResponse {
  const code = authErrorCode(reason);
  if (
    code === "invalid_credentials" ||
    code === "email_not_confirmed" ||
    code === "user_not_found"
  ) {
    return { kind: "failure", message: LOGIN_FAILURE_MESSAGE };
  }

  return { kind: "failure", message: toAuthFailure(reason).message };
}

export function signupResponse(reason?: unknown): AuthPublicResponse {
  if (reason === undefined || hiddenSignupCodes.has(authErrorCode(reason) ?? "")) {
    return { kind: "check_email", message: SIGNUP_CHECK_EMAIL_MESSAGE };
  }

  return { kind: "failure", message: toAuthFailure(reason).message };
}

export function passwordResetResponse(reason?: unknown): AuthPublicResponse {
  if (reason === undefined || authErrorCode(reason) === "user_not_found") {
    return {
      kind: "check_email",
      message: PASSWORD_RESET_CHECK_EMAIL_MESSAGE,
    };
  }

  return { kind: "failure", message: toAuthFailure(reason).message };
}
