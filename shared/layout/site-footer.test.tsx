import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("SiteFooter", () => {
  it("keeps policy links without publishing operator contact details", () => {
    const source = readFileSync("shared/layout/site-footer.tsx", "utf8");
    const stylesheet = readFileSync("app/globals.css", "utf8");

    expect(source).toContain('keys={["privacy", "cookies", "terms", "refunds"]}');
    expect(source).not.toContain("PROJECTSCOUT_OPERATOR");
    expect(source).not.toContain("site-footer__business");
    expect(source).not.toContain("mailto:");
    expect(stylesheet).not.toContain(".site-footer__business");
  });
});
