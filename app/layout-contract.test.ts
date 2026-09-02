import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const layoutSource = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

describe("root html contract", () => {
  it("wraps the application in SmoothScroll to provide smooth scrolling using Lenis", () => {
    expect(layoutSource).toContain('<SmoothScroll>');
  });
});
