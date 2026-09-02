// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useGSAP } = vi.hoisted(() => ({ useGSAP: vi.fn() }));

vi.mock("@gsap/react", () => ({ useGSAP }));
vi.mock("gsap", () => ({
  gsap: {
    matchMedia: vi.fn(),
    registerPlugin: vi.fn(),
    set: vi.fn(),
    timeline: vi.fn(),
  },
}));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {} }));

import { ScrollGuide } from "./scroll-guide";
import { StepThreeVisual } from "./scroll-guide-visuals";

describe("ScrollGuide", () => {
  beforeEach(() => {
    useGSAP.mockClear();
  });

  it("renders one persistent guide with exactly three ordered steps", () => {
    render(<ScrollGuide preview={<section data-testid="trust-preview" />} />);

    const guide = screen.getByRole("region", {
      name: "Project research workflow",
    });
    const steps = within(guide).getAllByRole("listitem");

    expect(steps).toHaveLength(3);
    expect(within(steps[0]).getByRole("heading", { level: 3 })).toHaveTextContent(
      "Enter a topic or app",
    );
    expect(within(steps[1]).getByRole("heading", { level: 3 })).toHaveTextContent(
      "Find public evidence",
    );
    expect(within(steps[2]).getByRole("heading", { level: 3 })).toHaveTextContent(
      "Compare three project directions",
    );
    expect(steps[0]).toHaveTextContent(
      "Start with a rough topic, app idea, problem space, or concept.",
    );
    expect(steps[1]).toHaveTextContent(
      "ProjectScout looks for public evidence, recurring complaints, signals, and relevant sources.",
    );
    expect(steps[2]).toHaveTextContent(
      "Compare three distinct, realistic project directions instead of one generic recommendation.",
    );
    expect(within(guide).getByRole("list", { name: "Project research steps" }))
      .toBeInTheDocument();
    expect(steps[0]).toHaveAttribute("aria-current", "step");
    expect(
      within(guide).queryByRole("heading", { level: 2 }),
    ).not.toBeInTheDocument();
    expect(guide).not.toHaveTextContent(
      "From prompt to publish-ready content",
    );
  });

  it("keeps three animated panels without a decorative next-section peek", () => {
    render(<ScrollGuide preview={<section data-testid="trust-preview" />} />);

    const stage = screen.getByTestId("scroll-guide-stage");
    const panels = stage.querySelectorAll("[data-guide-panel]");

    expect(stage.children).toHaveLength(2);
    expect(panels).toHaveLength(3);
    expect(screen.getByTestId("trust-preview")).toBeVisible();
    expect(screen.queryByTestId("scroll-guide-next-section-peek"))
      .not.toBeInTheDocument();
  });

  it("uses the light accent color for the Step 3 glow", () => {
    const { container } = render(<StepThreeVisual />);

    expect(container.querySelector(".step3-glow2"))
      .toHaveAttribute("fill", "var(--color-accent-soft)");
  });

  it("centers the workflow above a responsive trust-preview row", () => {
    const stylesheet = readFileSync(
      resolve(
        process.cwd(),
        "features/landing/components/scroll-guide.module.css",
      ),
      "utf8",
    );

    expect(stylesheet).toContain(
      "height: calc(100dvh - var(--guide-header-height",
    );
    expect(stylesheet).toMatch(
      /\.stage\s*\{[\s\S]*?grid-template-rows:\s*minmax\(0, 1fr\) var\(--guide-preview-height\);/,
    );
    expect(stylesheet).toMatch(
      /\.workflowViewport\s*\{[\s\S]*?place-items: center;/,
    );
    expect(stylesheet).not.toContain(".heading");
    expect(stylesheet).not.toContain("nextSectionPeek");
    expect(stylesheet).toMatch(
      /--guide-preview-height:\s*clamp\([^;]+dvh[^;]+\);/,
    );
  });

  it("keeps the trust preview visible while the guide is pinned", () => {
    const stylesheet = readFileSync(
      resolve(
        process.cwd(),
        "features/landing/components/scroll-guide.module.css",
      ),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.preview\s*:global\(\.trust-elem\)[\s\S]*?opacity:\s*1\s*!important;[\s\S]*?visibility:\s*visible\s*!important;/,
    );
    expect(stylesheet).toMatch(
      /\.preview\s*:global\(\.trust-line\)[\s\S]*?transform:\s*scaleX\(1\)\s*!important;/,
    );
    expect(stylesheet).toMatch(
      /--guide-preview-height:\s*clamp\(7rem,\s*14dvh,\s*9rem\);/,
    );
    expect(stylesheet).toMatch(
      /\.preview\s*:global\(#trust\)[\s\S]*?min-height:\s*100%;[\s\S]*?padding-block:\s*clamp\(var\(--space-2xl\),\s*6dvh,\s*var\(--space-4xl\)\)[\s\S]*?var\(--space-md\);/,
    );
  });

  it("sizes the stage from the measured header without a forced minimum", () => {
    const stylesheet = readFileSync(
      resolve(
        process.cwd(),
        "features/landing/components/scroll-guide.module.css",
      ),
      "utf8",
    );

    expect(stylesheet).toContain(
      "height: calc(100dvh - var(--guide-header-height",
    );
    expect(stylesheet).not.toMatch(/\.backdrop(?:\s|\{|[A-Z])/);
    expect(stylesheet).not.toContain("min-height: 40rem");
  });

  it("installs its scoped GSAP scene once", () => {
    render(<ScrollGuide preview={<section data-testid="trust-preview" />} />);

    expect(useGSAP).toHaveBeenCalledOnce();
    expect(useGSAP.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ scope: expect.any(Object) }),
    );
  });
});
