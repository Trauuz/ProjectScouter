export type AuthIdentity = {
  id: string;
  email: string;
  initials: string;
};

export function createAuthIdentity(
  id: string,
  email: string | null | undefined,
): AuthIdentity | null {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!id || !normalizedEmail) {
    return null;
  }

  const localPart = normalizedEmail.split("@", 1)[0] || "user";
  const initials = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  return { id, email: normalizedEmail, initials };
}
