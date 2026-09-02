import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("./research.css", import.meta.url), "utf8");

function rule(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styles.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));

  expect(match, `Missing CSS rule for ${selector}`).not.toBeNull();
  return match?.[1] ?? "";
}

describe("research viewport layout", () => {
  it("keeps the document fixed and gives scrolling ownership to the results panel", () => {
    expect(rule(".research-shell")).toContain("height: 100dvh");
    expect(rule(".research-shell")).toContain("overflow: hidden");

    expect(rule(".research-page .research-workspace")).toContain("height: 100%");
    expect(rule(".research-page .research-workspace")).toContain(
      "grid-template-rows: minmax(0, 1fr)",
    );
    expect(rule(".research-page .research-workspace")).toContain("gap: 0");

    expect(rule(".research-workspace__body")).toContain("min-height: 0");
    expect(rule(".research-workspace__body")).toContain("overflow: hidden");

    expect(rule(".research-results")).toContain("min-height: 0");
    expect(rule(".research-results")).toContain("overflow-y: auto");
    expect(rule(".research-results")).toContain("overflow-x: hidden");
  });

  it("uses premium surfaces and deliberate card spacing", () => {
    expect(rule(".research-page .research-form textarea")).toContain(
      "border-radius: var(--radius-md)",
    );
    expect(rule(".research-page .research-form textarea")).toContain(
      "box-shadow:",
    );
    expect(rule(".research-request__submitted")).toContain(
      "border-radius: var(--radius-md)",
    );
    expect(rule(".research-page .recommendation-list")).toContain(
      "gap: var(--space-lg)",
    );
    expect(rule(".research-empty__card")).toContain(
      "border-radius: var(--radius-md)",
    );
    expect(rule(".research-loading__card")).toContain(
      "border-radius: var(--radius-md)",
    );
  });

  it("uses one report divider and aligns removal with the report title", () => {
    const reportHeader = rule(".research-page .research-report__header");
    expect(reportHeader).not.toContain(
      "border-block-end",
    );
    expect(reportHeader).toContain("padding-block-end: 0");
    expect(rule(".research-report__title-row")).toContain("display: flex");
    expect(rule(".research-report__title-row")).toContain("align-items: center");
    expect(rule(".research-report__title-row")).toContain(
      "justify-content: space-between",
    );
  });

  it("caps the sidebar on wide screens and keeps mobile results usable", () => {
    expect(styles).toContain(
      "grid-template-columns: clamp(19rem, 27vw, 26rem) minmax(0, 1fr)",
    );
    expect(styles).toContain("@media (max-width: 59.999rem)");
    expect(styles).toContain("min-height: 6rem");
  });

  it("uses available evidence-index space without overextending prose", () => {
    expect(rule(".research-page .source-index ol")).toContain(
      "grid-template-columns: repeat(auto-fit, minmax(min(28rem, 100%), 1fr))",
    );
    expect(rule(".research-page .source-index ol")).toContain(
      "gap: 0 var(--space-xl)",
    );
  });

  it("matches the authentication modal surface at every viewport", () => {
    expect(rule(".delete-research-dialog")).toContain(
      "max-height: min(calc(100dvh - var(--space-xl)), 48rem)",
    );

    const surface = rule(".delete-research-dialog__surface");
    expect(surface).toContain("position: relative");
    expect(surface).toContain("gap: var(--space-xl)");
    expect(surface).toContain(
      "padding: clamp(var(--space-xl), 8vw, var(--space-3xl))",
    );
    expect(surface).toContain("overflow-y: auto");
    expect(surface).toContain("overscroll-behavior: contain");

    expect(rule(".delete-research-dialog__close")).toContain(
      "width: 2.75rem",
    );
    expect(rule(".delete-research-dialog__actions")).toContain(
      "grid-template-columns: minmax(0, 1fr)",
    );
  });
});
