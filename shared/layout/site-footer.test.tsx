// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("keeps the existing navigation and exposes both legal routes at the right", () => {
    const { container } = render(<SiteFooter />);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Start research" }))
      .toHaveAttribute("href", "/research");
    expect(screen.getByRole("link", { name: "Privacy Policy" }))
      .toHaveAttribute("href", "/privacy-policy");
    expect(screen.getByRole("link", { name: "Terms of Service" }))
      .toHaveAttribute("href", "/terms-of-service");
    expect(container.querySelector(".site-footer__meta")?.lastElementChild)
      .toHaveClass("site-footer__legal");
  });
});
