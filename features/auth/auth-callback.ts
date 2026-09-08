export type AuthCallbackState =
  | "email-confirmed"
  | "confirmation-error"
  | "update-password";

export type ConsumedAuthCallback = {
  state: AuthCallbackState;
  cleanUrl: string;
};

const callbackStates: Readonly<Record<string, AuthCallbackState>> = {
  confirmed: "email-confirmed",
  "confirmation-error": "confirmation-error",
  "update-password": "update-password",
};

export function consumeAuthCallback(
  pathname: string,
  searchParams: URLSearchParams,
): ConsumedAuthCallback | null {
  const authValue = searchParams.get("auth");
  if (!authValue || !Object.hasOwn(callbackStates, authValue)) {
    return null;
  }

  const cleanSearchParams = new URLSearchParams(searchParams);
  cleanSearchParams.delete("auth");
  const cleanSearch = cleanSearchParams.toString();

  return {
    state: callbackStates[authValue],
    cleanUrl: cleanSearch ? `${pathname}?${cleanSearch}` : pathname,
  };
}
