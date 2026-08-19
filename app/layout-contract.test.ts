import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const layoutSource = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

describe("root html contract", () => {
  it("declares the smooth-scroll behavior expected by Next.js route transitions", () => {
    expect(layoutSource).toContain('data-scroll-behavior="smooth"');
  });
});
