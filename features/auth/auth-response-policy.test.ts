import { AuthApiError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  LOGIN_FAILURE_MESSAGE,
  PASSWORD_RESET_CHECK_EMAIL_MESSAGE,
  SIGNUP_CHECK_EMAIL_MESSAGE,
  loginFailureResponse,
  passwordResetResponse,
  signupResponse,
} from "./auth-response-policy";

function authError(code: string): AuthApiError {
  return new AuthApiError(`Supabase error: ${code}`, 400, code);
}

describe("public authentication responses", () => {
  it.each(["email_exists", "user_already_exists"])(
    "makes successful signup and %s indistinguishable",
    (code) => {
      expect(signupResponse(authError(code))).toEqual(signupResponse());
      expect(signupResponse(authError(code))).toEqual({
        kind: "check_email",
        message: SIGNUP_CHECK_EMAIL_MESSAGE,
      });
    },
  );

  it("makes reset for an existing and missing account indistinguishable", () => {
    expect(passwordResetResponse(authError("user_not_found"))).toEqual(
      passwordResetResponse(),
    );
    expect(passwordResetResponse()).toEqual({
      kind: "check_email",
      message: PASSWORD_RESET_CHECK_EMAIL_MESSAGE,
    });
  });

  it("makes a missing login account and invalid credentials indistinguishable", () => {
    expect(loginFailureResponse(authError("user_not_found"))).toEqual(
      loginFailureResponse(authError("invalid_credentials")),
    );
  });

  it("makes invalid credentials and an unconfirmed account indistinguishable", () => {
    expect(loginFailureResponse(authError("email_not_confirmed"))).toEqual(
      loginFailureResponse(authError("invalid_credentials")),
    );
    expect(loginFailureResponse(authError("email_not_confirmed"))).toEqual({
      kind: "failure",
      message: LOGIN_FAILURE_MESSAGE,
    });
  });

  it("keeps weak-password and rate-limit signup failures distinct", () => {
    const successfulSignup = signupResponse();

    expect(signupResponse(authError("weak_password"))).not.toEqual(successfulSignup);
    expect(signupResponse(authError("over_request_rate_limit"))).not.toEqual(
      successfulSignup,
    );
  });
});
