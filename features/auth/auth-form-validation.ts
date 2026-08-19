import { z } from "zod";

const emailSchema = z.email().trim();
const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Za-z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

export function validateEmail(email: string): string | null {
  return emailSchema.safeParse(email).success
    ? null
    : "Enter a valid email address.";
}

export function validatePassword(password: string): string | null {
  return passwordSchema.safeParse(password).success
    ? null
    : "Use at least 8 characters with a letter, number, and symbol.";
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): string | null {
  return password === confirmation
    ? null
    : "Enter the same password in both fields.";
}
