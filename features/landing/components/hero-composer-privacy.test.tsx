import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("hero composer privacy notice", () => {
  it("renders outside the prompt form while remaining its accessible description", () => {
    const composer = readFileSync(
      "features/landing/components/hero-composer.tsx",
      "utf8",
    );
    const landingPage = readFileSync("features/landing/landing-page.tsx", "utf8");

    expect(composer).toContain('aria-describedby="hero-prompt-privacy"');
    expect(composer).not.toContain('id="hero-prompt-privacy"');
    expect(landingPage.indexOf("<HeroPromptPrivacyNotice />")).toBeGreaterThan(
      landingPage.indexOf("</main>"),
    );
  });

  it("pins a slim edge-to-edge notice to the bottom of the viewport", () => {
    const stylesheet = readFileSync("app/globals.css", "utf8");
    const privacyRule = stylesheet.match(
      /\.hero-composer__privacy\s*\{([^}]*)\}/,
    );

    expect(privacyRule?.[1]).toContain("position: fixed");
    expect(privacyRule?.[1]).toContain("inset-block-end: 0");
    expect(privacyRule?.[1]).toContain("inset-inline: 0");
    expect(privacyRule?.[1]).toContain("width: 100%");
    expect(privacyRule?.[1]).toContain("env(safe-area-inset-bottom)");
  });
});
