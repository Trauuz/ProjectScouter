// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TermsOfServicePage, { metadata } from "./page";

vi.mock("@/shared/layout/site-header", () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}));

vi.mock("@/shared/layout/site-footer", () => ({
  SiteFooter: () => <footer data-testid="site-footer" />,
}));

describe("TermsOfServicePage", () => {
  it("publishes route metadata and the current terms date", () => {
    render(<TermsOfServicePage />);

    expect(metadata.title).toBe("Terms of Service | ProjectScout");
    expect(screen.getByRole("heading", { name: "Terms of Service", level: 1 }))
      .toBeInTheDocument();
    expect(screen.getByText("August 26, 2026")).toHaveAttribute(
      "dateTime",
      "2026-08-26",
    );
  });

  it("covers the service agreement and keeps legal routes connected", () => {
    render(<TermsOfServicePage />);

    for (const heading of [
      "Acceptance of Terms",
      "Eligibility",
      "Account Registration",
      "User Content and Research Prompts",
      "AI-Generated Content and Research Results",
      "Acceptable Use",
      "Privacy",
      "Limitation of Liability",
      "Governing Law",
      "Contact Information",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }

    expect(screen.getByRole("link", { name: "Privacy Policy" }))
      .toHaveAttribute("href", "/privacy-policy");
    expect(screen.getByRole("link", { name: "legal@projectscout.example" }))
      .toHaveAttribute("href", "mailto:legal@projectscout.example");
    expect(screen.getByTestId("site-header")).toBeInTheDocument();
    expect(screen.getByTestId("site-footer")).toBeInTheDocument();
  });

  it("does not invent payment terms for a service with no billing flow", () => {
    render(<TermsOfServicePage />);

    expect(screen.queryByRole("heading", { name: /payments|subscriptions/i }))
      .not.toBeInTheDocument();
  });
});
