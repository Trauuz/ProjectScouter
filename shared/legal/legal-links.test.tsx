// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LegalLinks } from "./legal-links";

describe("LegalLinks", () => {
  it("renders both internal legal routes in the requested order", () => {
    const { container } = render(<LegalLinks order="terms-first" />);
    const links = container.querySelectorAll("a");

    expect(links[0]).toHaveTextContent("Terms of Service");
    expect(links[0]).toHaveAttribute("href", "/terms-of-service");
    expect(links[1]).toHaveTextContent("Privacy Policy");
    expect(links[1]).toHaveAttribute("href", "/privacy-policy");
  });

  it("notifies its owner when either destination is activated", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<LegalLinks onNavigate={onNavigate} />);

    const terms = screen.getByRole("link", { name: "Terms of Service" });
    terms.addEventListener("click", (event) => event.preventDefault());
    await user.click(terms);

    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
