import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const contactEmail = "tristancarabbacan06@gmail.com";
const privacyPolicy = readFileSync(
  new URL("./privacy-policy/page.tsx", import.meta.url),
  "utf8",
);
const termsOfService = readFileSync(
  new URL("./terms-of-service/page.tsx", import.meta.url),
  "utf8",
);

describe("legal contact details", () => {
  it("uses the requested contact email in both legal documents", () => {
    expect(privacyPolicy).toContain(contactEmail);
    expect(termsOfService).toContain(contactEmail);
  });

  it("identifies the Terms address as the official legal contact", () => {
    expect(termsOfService).toContain(
      "This is ProjectScout’s official legal contact address.",
    );
    expect(termsOfService).not.toContain(
      "This is a placeholder contact address",
    );
  });
});

describe("Philippine legal framework", () => {
  it("grounds the Terms in applicable Philippine laws without launch placeholders", () => {
    expect(termsOfService).toContain("laws of the Republic of the Philippines");
    expect(termsOfService).toContain("Republic Act No. 8792");
    expect(termsOfService).toContain("Republic Act No. 10175");
    expect(termsOfService).toContain("Republic Act No. 8293");
    expect(termsOfService).toContain("Republic Act No. 7394");
    expect(termsOfService).not.toContain("PLACEHOLDER");
    expect(termsOfService).not.toContain("[Insert");
  });

  it("states the Data Privacy Act framework and all statutory data-subject rights", () => {
    expect(privacyPolicy).toContain("Republic Act No. 10173");
    expect(privacyPolicy).toContain("National Privacy Commission");
    for (const right of [
      "be informed",
      "object",
      "access",
      "correct",
      "erase or block",
      "data portability",
      "damages",
      "file a complaint",
    ]) {
      expect(privacyPolicy).toContain(right);
    }
    expect(privacyPolicy).not.toContain("placeholder contact address");
  });
});
