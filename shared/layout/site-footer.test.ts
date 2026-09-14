import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const footerStyles = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);

describe("site footer layout", () => {
  it("stacks the copyright below the legal links at the trailing edge", () => {
    expect(footerStyles).toMatch(
      /\.site-footer__legal-block\s*{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*align-items:\s*flex-end;[^}]*justify-self:\s*end;/,
    );
  });

  it("top-aligns navigation links with policy links on wide screens", () => {
    expect(footerStyles).toMatch(
      /@media \(min-width:\s*40rem\)\s*{\s*\.site-footer__meta\s*{[^}]*align-items:\s*start;/,
    );
  });
});
