// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PrivacyPolicyPage, { metadata } from "./page";

vi.mock("@/shared/layout/site-header", () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}));

vi.mock("@/shared/layout/site-footer", () => ({
  SiteFooter: () => <footer data-testid="site-footer" />,
}));

describe("PrivacyPolicyPage", () => {
  it("publishes route metadata and the current policy date", () => {
    render(<PrivacyPolicyPage />);

    expect(metadata.title).toBe("Privacy Policy | ProjectScout");
    expect(screen.getByRole("heading", { name: "Privacy Policy", level: 1 }))
      .toBeInTheDocument();
    expect(screen.getByText("August 25, 2026")).toHaveAttribute(
      "dateTime",
      "2026-08-25",
    );
  });

  it("covers the service's information practices and contact path", () => {
    render(<PrivacyPolicyPage />);

    for (const heading of [
      "Information We Collect",
      "Research Prompts and User Content",
      "Cookies and Similar Technologies",
      "Third-Party Services",
      "Data Retention",
      "User Rights and Choices",
      "Children’s Privacy",
      "Contact Information",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }

    expect(screen.getByRole("link", { name: "privacy@projectscout.example" }))
      .toHaveAttribute("href", "mailto:privacy@projectscout.example");
    expect(screen.getByTestId("site-header")).toBeInTheDocument();
    expect(screen.getByTestId("site-footer")).toBeInTheDocument();
  });
});
