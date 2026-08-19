// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext, type AuthContextValue } from "./auth-context";
import { AuthDialog } from "./auth-dialog";

function context(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    ready: true,
    isOpen: true,
    mode: "login",
    noticeEmail: "",
    noticeMessage: "",
    openAuth: vi.fn(),
    closeAuth: vi.fn(),
    requireAuth: vi.fn(() => false),
    signIn: vi.fn(async () => ({ ok: true as const })),
    signUp: vi.fn(async () => ({ ok: true as const })),
    sendPasswordReset: vi.fn(async () => ({ ok: true as const })),
    updatePassword: vi.fn(async () => ({ ok: true as const })),
    signOut: vi.fn(async () => undefined),
    ...overrides,
  };
}

function renderDialog(value: AuthContextValue) {
  return render(
    <AuthContext.Provider value={value}>
      <AuthDialog />
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
});

describe("AuthDialog", () => {
  it("renders a labelled login form and forgot-password path", () => {
    renderDialog(context());

    expect(screen.getByRole("dialog")).toHaveAttribute("open");
    expect(screen.getByRole("heading", { name: "Continue your research" }))
      .toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Forgot your password?" }))
      .toBeInTheDocument();
  });

  it("closes when a click starts and ends on the backdrop", () => {
    const closeAuth = vi.fn();
    renderDialog(context({ closeAuth }));

    const dialog = screen.getByRole("dialog");
    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);

    expect(closeAuth).toHaveBeenCalledOnce();
  });

  it("stays open when a pointer drag starts in an input and ends outside", () => {
    const closeAuth = vi.fn();
    renderDialog(context({ closeAuth }));

    fireEvent.pointerDown(screen.getByLabelText("Email address"));
    fireEvent.click(screen.getByRole("dialog"));

    expect(closeAuth).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveAttribute("open");
  });

  it("closes when the user activates the explicit close control", async () => {
    const closeAuth = vi.fn();
    const user = userEvent.setup();
    renderDialog(context({ closeAuth }));

    await user.click(screen.getByRole("button", { name: "Close authentication" }));

    expect(closeAuth).toHaveBeenCalledOnce();
  });

  it("blocks invalid signup fields before calling Supabase", async () => {
    const signUp = vi.fn(async () => ({ ok: true as const }));
    const user = userEvent.setup();
    renderDialog(context({ mode: "signup", signUp }));

    await user.type(screen.getByLabelText("Email address"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.type(screen.getByLabelText("Confirm password"), "different");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(signUp).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter the same password in both fields."))
      .toBeInTheDocument();
  });

  it("shows the email-confirmation success state", () => {
    renderDialog(context({
      mode: "check-email",
      noticeEmail: "student@example.com",
    }));

    expect(screen.getByRole("heading", { name: "Check your email" }))
      .toBeInTheDocument();
    expect(screen.getByText("student@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});
