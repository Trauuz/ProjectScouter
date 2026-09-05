"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import type { AuthIdentity } from "@/shared/auth/auth-identity";

const BUG_REPORT_URL = "https://github.com/Trauuz/ProjectScouter/issues/new";
const BUG_REPORT_MAX_LENGTH = 2000;

type AccountMenuProps = {
  user: AuthIdentity;
  onSignOut(): Promise<void> | void;
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
  | "help"
  | "logout"
  | "privacy"
  | "report"
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
          <span>Credits remaining</span>
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
            ? `Resets ${resetDateLabel(usage.resetsAt)} at 00:00 UTC.`
            : "Loading this month’s usage.")}
        </p>
        <button className="button usage-dialog__close" type="button" onClick={onClose}>
          Close
        </button>
      </div>
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
            placeholder="Tell us what went wrong and what you expected to happen."
            onChange={(event) => setDescription(event.target.value)}
          />
          <span className="bug-report-dialog__counter" aria-live="polite">
            {description.length} / {BUG_REPORT_MAX_LENGTH} characters
          </span>
        </div>

        <p className="bug-report-dialog__note">
          Your report will open as a pre-filled GitHub issue so you can review
          it before submitting.
        </p>

        <div className="bug-report-dialog__actions">
          <button className="button bug-report-dialog__cancel" type="button" onClick={closeDialog}>
            Cancel
          </button>
          <button className="button" type="submit" disabled={!trimmedDescription}>
            Continue to GitHub
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function AccountMenu({ user, onSignOut }: AccountMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const usageTitleId = useId();
  const bugReportTitleId = useId();
  const bugReportTextareaId = useId();
  const [helpOpen, setHelpOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);

  function closeMenu() {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
    setHelpOpen(false);
  }

  function showUsage() {
    closeMenu();
    setUsageOpen(true);
  }

  function showBugReport() {
    closeMenu();
    setBugReportOpen(true);
  }

  function signOut() {
    closeMenu();
    void onSignOut();
  }

  return (
    <>
      <details
        className="account-menu"
        ref={detailsRef}
        onToggle={(event) => {
          if (!event.currentTarget.open) {
            setHelpOpen(false);
          }
        }}
      >
        <summary aria-label={`Account menu for ${user.email}`}>
          <span aria-hidden="true">{user.initials}</span>
        </summary>
        <div className="account-menu__panel">
          <div className="account-menu__identity">
            <span aria-hidden="true">{user.initials}</span>
            <p>{user.email}</p>
          </div>

          {helpOpen ? (
            <div className="account-menu__view" aria-label="Help menu">
              <button
                className="account-menu__item account-menu__back"
                type="button"
                onClick={() => setHelpOpen(false)}
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
              <button
                className="account-menu__item"
                type="button"
                onClick={showBugReport}
              >
                <MenuIcon name="report" />
                <span>Report a bug</span>
              </button>
            </div>
          ) : (
            <div className="account-menu__view" aria-label="Account options">
              <Link className="account-menu__item" href="/research" onClick={closeMenu}>
                <MenuIcon name="dashboard" />
                <span>Dashboard</span>
              </Link>
              <button className="account-menu__item" type="button" onClick={showUsage}>
                <MenuIcon name="usage" />
                <span>Usage</span>
              </button>
              <button
                className="account-menu__item account-menu__item--forward"
                type="button"
                onClick={() => setHelpOpen(true)}
              >
                <MenuIcon name="help" />
                <span>Help</span>
                <span className="account-menu__chevron" aria-hidden="true">›</span>
              </button>
              <div className="account-menu__rule" />
              <button
                className="account-menu__item account-menu__logout"
                type="button"
                onClick={signOut}
              >
                <MenuIcon name="logout" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </details>
      <UsageDialog
        open={usageOpen}
        titleId={usageTitleId}
        onClose={() => setUsageOpen(false)}
      />
      <BugReportDialog
        open={bugReportOpen}
        titleId={bugReportTitleId}
        textareaId={bugReportTextareaId}
        onClose={() => setBugReportOpen(false)}
      />
    </>
  );
}
