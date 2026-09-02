// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { useAuth } = vi.hoisted(() => ({
  useAuth: vi.fn(() => ({
    user: null,
    openAuth: vi.fn(),
  })),
}));

vi.mock("@/features/auth", () => ({ useAuth }));

import { SiteHeader } from "./site-header";

describe("SiteHeader", () => {
  it("links both desktop and mobile navigation to the landing story", () => {
    render(<SiteHeader />);

    const destinations = [
      ["How it works", "/#how-it-works"],
      ["Evidence", "/#evidence"],
    ] as const;

    for (const [label, href] of destinations) {
      const links = screen.getAllByRole("link", { name: label });
      expect(links).toHaveLength(2);
      expect(links.every((link) => link.getAttribute("href") === href)).toBe(true);
    }

    expect(screen.queryByRole("link", { name: "Example" }))
      .not.toBeInTheDocument();

    const researchLinks = screen.getAllByRole("link", {
      name: "Open research",
    });
    expect(researchLinks).toHaveLength(2);
    expect(researchLinks.every((link) => link.getAttribute("href") === "/research"))
      .toBe(true);
  });

  it("closes the mobile menu after opening research", () => {
    render(<SiteHeader />);

    const mobileNavigation = screen
      .getByRole("navigation", { name: "Mobile navigation" })
      .closest("details");
    expect(mobileNavigation).not.toBeNull();

    if (!mobileNavigation) {
      return;
    }

    mobileNavigation.open = true;
    fireEvent.click(
      screen
        .getByRole("navigation", { name: "Mobile navigation" })
        .querySelector('a[href="/research"]')!,
    );

    expect(mobileNavigation.open).toBe(false);
  });
});
