export type MonthlyUsage = Readonly<{
  limit: number;
  used: number;
  remaining: number;
  periodStart: string;
  resetsAt: string;
}>;

export type UsageDialogState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "error" }>
  | Readonly<{ status: "ready"; usage: MonthlyUsage }>;

export type UsageDialogPresentation = Readonly<{
  state: "loading" | "error" | "empty" | "ready";
  balance: string;
  note: string;
  showRetry: boolean;
}>;

function resetDateLabel(resetsAt: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(resetsAt));
}

export function usageDialogPresentation(
  state: UsageDialogState,
): UsageDialogPresentation {
  if (state.status === "loading") {
    return {
      state: "loading",
      balance: "Loading…",
      note: "Loading this month’s usage.",
      showRetry: false,
    };
  }
  if (state.status === "error") {
    return {
      state: "error",
      balance: "Unavailable",
      note: "Usage is temporarily unavailable.",
      showRetry: true,
    };
  }

  const balance = `${state.usage.remaining} of ${state.usage.limit}`;
  const reset = `Resets ${resetDateLabel(state.usage.resetsAt)} at 00:00 UTC.`;
  if (state.usage.used === 0) {
    return {
      state: "empty",
      balance,
      note: `You haven’t used any research credits this month. ${reset}`,
      showRetry: false,
    };
  }
  return {
    state: "ready",
    balance,
    note: `One credit runs one public-evidence search and one AI comparison. ${reset}`,
    showRetry: false,
  };
}
