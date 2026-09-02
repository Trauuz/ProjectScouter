// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/layout/site-header", () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}));

vi.mock("@/shared/layout/site-footer", () => ({
  SiteFooter: () => <footer data-testid="site-footer" />,
}));

vi.mock("@/shared/motion/motion-scene", () => ({
  MotionScene: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/features/auth", () => ({
  StartResearchButton: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("./components/research-map", () => ({
  ResearchMap: () => <div data-testid="research-map" />,
}));

vi.mock("./components/scroll-guide", () => ({
  ScrollGuide: ({ preview }: { preview: React.ReactNode }) => (
    <section id="how-it-works">{preview}</section>
  ),
}));

import { LandingPage } from "./landing-page";

describe("LandingPage", () => {
  it("composes the complete ProjectScout story in the requested order", () => {
    const { container } = render(<LandingPage />);
    const sections = Array.from(
      container.querySelectorAll("main > section, main > div > section"),
    );

    expect(sections.map((section) => section.id)).toEqual([
      "hero",
      "how-it-works",
      "evidence",
      "directions",
      "audience",
      "before-after",
      "principles",
      "research",
    ]);
    expect(container.querySelector("#how-it-works > #trust"))
      .toBeInTheDocument();
    expect(screen.getByTestId("site-header")).toBeInTheDocument();
    expect(screen.getByTestId("site-footer")).toBeInTheDocument();
  });

  it("closes with the evidence-backed three-direction promise", () => {
    render(<LandingPage />);

    expect(screen.getByRole("heading", { name: "Ready to test a direction?" }))
      .toBeInTheDocument();
    expect(screen.getByText(
      "Bring a rough topic. Leave with three evidence-backed directions.",
    )).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get started for free" }))
      .toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open research" }))
      .not.toBeInTheDocument();
  });
});
