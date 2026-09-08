import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  new URL("./scroll-guide.module.css", import.meta.url),
  "utf8",
);

describe("trusted workflow phone layout", () => {
  it("allocates a content-sized preview row and shows every workflow point", () => {
    expect(stylesheet).toMatch(
      /@media \(max-width: 39\.999rem\)[\s\S]*?grid-template-rows:\s*minmax\(0, 1fr\) auto;/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 39\.999rem\)[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/,
    );
  });

  it("centers each icon and label within its mobile grid column", () => {
    expect(stylesheet).toMatch(
      /\.preview :global\(#trust\) li \{[\s\S]*?justify-content:\s*center;[\s\S]*?text-align:\s*center;/,
    );
  });
});
