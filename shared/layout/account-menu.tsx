"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import type { AuthIdentity } from "@/shared/auth/auth-identity";

const BUG_REPORT_URL = "https://github.com/Trauuz/ProjectScouter/issues/new";
const BUG_REPORT_MAX_LENGTH = 2000;

type AccountMenuProps = {
  user: AuthIdentity;
  onSignOut(): Promise<SignOutResult>;
  onDeleteAccount(): Promise<SignOutResult>;
};

type SignOutResult =
  | { ok: true }
  | { ok: false; message: string };

type AccountMenuPanelProps = AccountMenuProps & {
  active?: boolean;
  onRequestClose?(): void;
};

type MonthlyUsage = {
  limit: number;
  used: number;
  remaining: number;
  periodStart: string;
  resetsAt: string;
};

function resetDateLabel(resetsAt: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(resetsAt));
}

type MenuIconName =
  | "back"
  | "dashboard"
  | "delete"
  | "help"
  | "logout"
  | "privacy"
  | "report"
  | "settings"
  | "terms"
  | "usage";

function MenuIcon({ name }: { name: MenuIconName }) {
  const paths: Record<MenuIconName, React.ReactNode> = {
    back: <path d="m14.5 5-7 7 7 7" />,
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    delete: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="m19 6-1 14H6L5 6" />
        <path d="M10 11v5M14 11v5" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.8 9a2.4 2.4 0 1 1 3.6 2.1c-.9.5-1.4 1.1-1.4 2.1" />
        <path d="M12 17h.01" />
      </>
    ),
    logout: (
      <>
        <path d="M10 4H5v16h5" />
        <path d="M14 8l4 4-4 4" />
        <path d="M18 12H9" />
      </>
    ),
    privacy: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 8h.01" />
      </>
    ),
    report: (
      <>
        <path d="M8 8.5 5.5 6M16 8.5 18.5 6M12 5V2" />
        <rect x="6" y="6" width="12" height="15" rx="6" />
        <path d="M6 13H3M21 13h-3M7 18l-2 2M17 18l2 2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    terms: (
      <>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M15 3v4h4M9 12h6M9 16h6" />
      </>
    ),
    usage: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  };

  return (
    <svg
      className="account-menu__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function UsageDialog({
  open,
  titleId,
  onClose,
}: {
  open: boolean;
  titleId: string;
  onClose(): void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPointerDownRef = useRef(false);
  const [usage, setUsage] = useState<MonthlyUsage | null>(null);
  const [usageError, setUsageError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();
    void fetch("/api/usage", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Usage could not be loaded.");
        }
        return response.json() as Promise<MonthlyUsage>;
      })
      .then((nextUsage) => {
        setUsageError("");
        setUsage(nextUsage);
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) {
          setUsageError("Usage is temporarily unavailable.");
        }
      });

    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

  return (
    <dialog
      className="usage-dialog"
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
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
          onClose();
        }
      }}
    >
      <div className="usage-dialog__surface" data-lenis-prevent>
        <div className="usage-dialog__header">
          <p>Account usage</p>
          <h2 id={titleId}>Usage</h2>
        </div>
        <div className="usage-dialog__balance" role="status">
          <span>Monthly research credits</span>
          <strong>
            {usageError
              ? "Unavailable"
              : usage
                ? `${usage.remaining} of ${usage.limit}`
                : "Loading…"}
          </strong>
        </div>
        <p className="usage-dialog__note">
          {usageError || (usage
            ? `One credit runs one public-evidence search and one AI comparison. Resets ${resetDateLabel(usage.resetsAt)} at 00:00 UTC.`
            : "Loading this month’s usage.")}
        </p>
        <button className="button usage-dialog__close" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </dialog>
  );
}

function AccountDeletionDialog({
  open,
  titleId,
  descriptionId,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  titleId: string;
  descriptionId: string;
  pending: boolean;
  error: string;
  onClose(): void;
  onConfirm(): void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPointerDownRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

  function requestClose() {
    if (!pending) {
      onClose();
    }
  }

  return (
    <dialog
      className="account-deletion-dialog"
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
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
          requestClose();
        }
      }}
    >
      <form
        className="account-deletion-dialog__surface"
        data-lenis-prevent
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <header className="account-deletion-dialog__header">
          <div>
            <p>Account settings</p>
            <h2 id={titleId}>Delete your account?</h2>
          </div>
          <button
            className="account-deletion-dialog__close"
            type="button"
            aria-label="Close account deletion confirmation"
            disabled={pending}
            onClick={requestClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <p className="account-deletion-dialog__note" id={descriptionId}>
          This starts permanent account deletion and immediately revokes access.
          ProjectScout then deletes your login, server-side research and usage
          history, and this browser&apos;s saved research. Temporary failures are
          recorded and retried. This action cannot be undone.
        </p>

        {error ? (
          <p className="account-deletion-dialog__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="account-deletion-dialog__actions">
          <button
            className="button account-deletion-dialog__cancel"
            type="button"
            disabled={pending}
            onClick={requestClose}
          >
            Cancel
          </button>
          <button
            className="button account-deletion-dialog__confirm"
            type="submit"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function createBugReportUrl(description: string): string {
  const issueUrl = new URL(BUG_REPORT_URL);
  issueUrl.searchParams.set("title", "Bug report");
  issueUrl.searchParams.set("body", description);
  return issueUrl.toString();
}

function BugReportDialog({
  open,
  titleId,
  textareaId,
  onClose,
}: {
  open: boolean;
  titleId: string;
  textareaId: string;
  onClose(): void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPointerDownRef = useRef(false);
  const [description, setDescription] = useState("");
  const trimmedDescription = description.trim();
  const noticeId = `${textareaId}-notice`;

  function closeDialog() {
    setDescription("");
    onClose();
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

  function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedDescription) {
      return;
    }
    window.open(
      createBugReportUrl(trimmedDescription),
      "_blank",
      "noopener,noreferrer",
    );
    closeDialog();
  }

  return (
    <dialog
      className="bug-report-dialog"
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
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
          closeDialog();
        }
      }}
    >
      <form
        className="bug-report-dialog__surface"
        data-lenis-prevent
        onSubmit={submitReport}
      >
        <header className="bug-report-dialog__header">
          <div>
            <p>ProjectScout feedback</p>
            <h2 id={titleId}>What happened?</h2>
          </div>
          <button
            className="bug-report-dialog__close"
            type="button"
            aria-label="Close bug report"
            onClick={closeDialog}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="bug-report-dialog__field">
          <label htmlFor={textareaId}>Describe the issue</label>
          <textarea
            id={textareaId}
            value={description}
            maxLength={BUG_REPORT_MAX_LENGTH}
            aria-describedby={noticeId}
            placeholder="Tell us what went wrong and what you expected to happen."
            onChange={(event) => setDescription(event.target.value)}
          />
          <span className="bug-report-dialog__counter" aria-live="polite">
            {description.length} / {BUG_REPORT_MAX_LENGTH} characters
          </span>
        </div>

        <p className="bug-report-dialog__note" id={noticeId}>
          Continuing sends this description to GitHub to create a draft. It
          becomes public only if you submit the issue there. Do not include
          personal, sensitive, or confidential information.
        </p>

        <div className="bug-report-dialog__actions">
          <button className="button bug-report-dialog__cancel" type="button" onClick={closeDialog}>
            Cancel
          </button>
          <button className="button" type="submit" disabled={!trimmedDescription}>
            Open GitHub draft
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function AccountMenuPanel({
  user,
  onSignOut,
  onDeleteAccount,
  active = true,
  onRequestClose,
}: AccountMenuPanelProps) {
  const usageTitleId = useId();
  const bugReportTitleId = useId();
  const bugReportTextareaId = useId();
  const deletionTitleId = useId();
  const deletionDescriptionId = useId();
  const signOutErrorId = useId();
  const [menuView, setMenuView] = useState<"root" | "help" | "settings">("root");
  const [usageOpen, setUsageOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);
  const [deletionPending, setDeletionPending] = useState(false);
  const [deletionError, setDeletionError] = useState("");
  const [signOutPending, setSignOutPending] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    if (!active) {
      setMenuView("root");
    }
  }, [active]);

  function closeMenu() {
    setMenuView("root");
    onRequestClose?.();
  }

  function showUsage() {
    setUsageOpen(true);
  }

  function showBugReport() {
    setBugReportOpen(true);
  }

  function showAccountDeletion() {
    setDeletionError("");
    setDeletionOpen(true);
  }

  async function confirmAccountDeletion() {
    if (deletionPending) {
      return;
    }

    setDeletionError("");
    setDeletionPending(true);
    try {
      const result = await onDeleteAccount();
      if (!result.ok) {
        setDeletionError(result.message);
        return;
      }
      setDeletionOpen(false);
      closeMenu();
    } catch {
      setDeletionError("Your account could not be deleted. Please try again.");
    } finally {
      setDeletionPending(false);
    }
  }

  async function signOut() {
    if (signOutPending) {
      return;
    }

    setSignOutError("");
    setSignOutPending(true);
    try {
      const result = await onSignOut();
      if (!result.ok) {
        setSignOutError(result.message);
        return;
      }
      closeMenu();
    } catch {
      setSignOutError(
        "Logout could not be completed. Check your connection and try again.",
      );
    } finally {
      setSignOutPending(false);
    }
  }

  return (
    <>
      <div className="account-menu__panel">
          <div className="account-menu__identity">
            <span aria-hidden="true">{user.initials}</span>
            <p>{user.email}</p>
          </div>

          {menuView === "help" ? (
            <div className="account-menu__view" aria-label="Help menu">
              <button
                className="account-menu__item account-menu__back"
                type="button"
                onClick={() => setMenuView("root")}
              >
                <MenuIcon name="back" />
                <span>Help</span>
              </button>
              <div className="account-menu__rule" />
              <Link className="account-menu__item" href="/terms-of-service" onClick={closeMenu}>
                <MenuIcon name="terms" />
                <span>Terms of Service</span>
              </Link>
              <Link className="account-menu__item" href="/privacy-policy" onClick={closeMenu}>
                <MenuIcon name="privacy" />
                <span>Privacy Policy</span>
              </Link>
              <Link className="account-menu__item" href="/cookie-policy" onClick={closeMenu}>
                <MenuIcon name="privacy" />
                <span>Cookie Policy</span>
              </Link>
              <Link className="account-menu__item" href="/refund-policy" onClick={closeMenu}>
                <MenuIcon name="terms" />
                <span>Refund Policy</span>
              </Link>
              <button
                className="account-menu__item"
                type="button"
                onClick={showBugReport}
              >
                <MenuIcon name="report" />
                <span>Report a bug</span>
              </button>
            </div>
          ) : menuView === "settings" ? (
            <div className="account-menu__view" aria-label="Settings menu">
              <button
                className="account-menu__item account-menu__back"
                type="button"
                onClick={() => setMenuView("root")}
              >
                <MenuIcon name="back" />
                <span>Settings</span>
              </button>
              <div className="account-menu__rule" />
              <button className="account-menu__item" type="button" onClick={showUsage}>
                <MenuIcon name="usage" />
                <span>Usage</span>
              </button>
              <button
                className="account-menu__item account-menu__delete"
                type="button"
                onClick={showAccountDeletion}
              >
                <MenuIcon name="delete" />
                <span>Delete account</span>
              </button>
            </div>
          ) : (
            <div className="account-menu__view" aria-label="Account options">
              <Link className="account-menu__item" href="/research" onClick={closeMenu}>
                <MenuIcon name="dashboard" />
                <span>Dashboard</span>
              </Link>
              <button
                className="account-menu__item account-menu__item--forward"
                type="button"
                onClick={() => setMenuView("settings")}
              >
                <MenuIcon name="settings" />
                <span>Settings</span>
                <span className="account-menu__chevron" aria-hidden="true">›</span>
              </button>
              <button
                className="account-menu__item account-menu__item--forward"
                type="button"
                onClick={() => setMenuView("help")}
              >
                <MenuIcon name="help" />
                <span>Help</span>
                <span className="account-menu__chevron" aria-hidden="true">›</span>
              </button>
              <div className="account-menu__rule" />
              <button
                className="account-menu__item account-menu__logout"
                type="button"
                disabled={signOutPending}
                aria-busy={signOutPending}
                aria-describedby={signOutError ? signOutErrorId : undefined}
                data-state={
                  signOutPending ? "loading" : signOutError ? "error" : undefined
                }
                onClick={() => void signOut()}
              >
                <MenuIcon name="logout" />
                <span>{signOutPending ? "Logging out…" : "Log out"}</span>
              </button>
              {signOutError ? (
                <p className="account-menu__error" id={signOutErrorId} role="alert">
                  {signOutError}
                </p>
              ) : null}
            </div>
          )}
      </div>
      <UsageDialog
        open={usageOpen}
        titleId={usageTitleId}
        onClose={() => {
          setUsageOpen(false);
          closeMenu();
        }}
      />
      <AccountDeletionDialog
        open={deletionOpen}
        titleId={deletionTitleId}
        descriptionId={deletionDescriptionId}
        pending={deletionPending}
        error={deletionError}
        onClose={() => {
          setDeletionError("");
          setDeletionOpen(false);
        }}
        onConfirm={() => void confirmAccountDeletion()}
      />
      <BugReportDialog
        open={bugReportOpen}
        titleId={bugReportTitleId}
        textareaId={bugReportTextareaId}
        onClose={() => {
          setBugReportOpen(false);
          closeMenu();
        }}
      />
    </>
  );
}

export function AccountMenu({ user, onSignOut, onDeleteAccount }: AccountMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  function closeMenu() {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }

  return (
    <details
      className="account-menu"
      ref={detailsRef}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary aria-label={`Account menu for ${user.email}`}>
        <span aria-hidden="true">{user.initials}</span>
      </summary>
      <AccountMenuPanel
        user={user}
        onSignOut={onSignOut}
        onDeleteAccount={onDeleteAccount}
        active={open}
        onRequestClose={closeMenu}
      />
    </details>
  );
}
