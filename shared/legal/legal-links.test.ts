import { describe, expect, it } from "vitest";

import {
  LEGAL_DESTINATIONS,
  selectLegalDestinations,
} from "./legal-links";

describe("legal links", () => {
  it("publishes every policy users need to reach from the site footer", () => {
    expect(LEGAL_DESTINATIONS).toEqual({
      privacy: { href: "/privacy-policy", label: "Privacy Policy" },
      cookies: { href: "/cookie-policy", label: "Cookie Policy" },
      terms: { href: "/terms-of-service", label: "Terms of Service" },
      refunds: { href: "/refund-policy", label: "Refund Policy" },
    });
  });

  it("allows forms to show only the policies relevant to that context", () => {
    expect(selectLegalDestinations(["terms", "privacy", "cookies"])).toEqual([
      LEGAL_DESTINATIONS.terms,
      LEGAL_DESTINATIONS.privacy,
      LEGAL_DESTINATIONS.cookies,
    ]);
  });
});
