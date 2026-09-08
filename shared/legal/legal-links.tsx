import Link from "next/link";

export type LegalLinkKey = "privacy" | "cookies" | "terms" | "refunds";

type LegalLinksProps = {
  className?: string;
  keys?: readonly LegalLinkKey[];
  onNavigate?: () => void;
  order?: "privacy-first" | "terms-first";
  separator?: string;
};

export const LEGAL_DESTINATIONS: Record<
  LegalLinkKey,
  { href: string; label: string }
> = {
  privacy: { href: "/privacy-policy", label: "Privacy Policy" },
  cookies: { href: "/cookie-policy", label: "Cookie Policy" },
  terms: { href: "/terms-of-service", label: "Terms of Service" },
  refunds: { href: "/refund-policy", label: "Refund Policy" },
};

export function selectLegalDestinations(keys: readonly LegalLinkKey[]) {
  return keys.map((key) => LEGAL_DESTINATIONS[key]);
}

export function LegalLinks({
  className,
  keys,
  onNavigate,
  order = "privacy-first",
  separator = " · ",
}: LegalLinksProps) {
  const orderedKeys: readonly LegalLinkKey[] = keys ?? (
    order === "terms-first" ? ["terms", "privacy"] : ["privacy", "terms"]
  );

  return (
    <span className={["legal-links", className].filter(Boolean).join(" ")}>
      {orderedKeys.map((key, index) => {
        const destination = LEGAL_DESTINATIONS[key];

        return (
          <span className="legal-links__item" key={destination.href}>
            {index > 0 ? (
              <span className="legal-links__separator" aria-hidden="true">
                {separator}
              </span>
            ) : null}
            <Link href={destination.href} onClick={onNavigate}>
              {destination.label}
            </Link>
          </span>
        );
      })}
    </span>
  );
}
