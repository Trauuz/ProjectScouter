import { describe, expect, it } from "vitest";

import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from "./auth-form-validation";

describe("authentication form validation", () => {
  it("rejects an invalid email address", () => {
    expect(validateEmail("not-an-email")).toBe(
      "Enter a valid email address.",
    );
    expect(validateEmail("student@example.com")).toBeNull();
  });

  it("requires a password with length, letters, numbers, and symbols", () => {
    expect(validatePassword("short")).not.toBeNull();
    expect(validatePassword("longpassword1")).not.toBeNull();
    expect(validatePassword("ProjectScout1!")).toBeNull();
  });

  it("requires password confirmation to match", () => {
    expect(validatePasswordConfirmation("ProjectScout1!", "Different1!"))
      .toBe("Enter the same password in both fields.");
    expect(validatePasswordConfirmation("ProjectScout1!", "ProjectScout1!"))
      .toBeNull();
  });
});
