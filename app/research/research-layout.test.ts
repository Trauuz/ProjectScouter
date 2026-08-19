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
});
