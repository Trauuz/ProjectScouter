import Link from "next/link";

type LegalLinkKey = "privacy" | "terms";

type LegalLinksProps = {
  className?: string;
  onNavigate?: () => void;
  order?: "privacy-first" | "terms-first";
  separator?: string;
};

const destinations: Record<LegalLinkKey, { href: string; label: string }> = {
  privacy: { href: "/privacy-policy", label: "Privacy Policy" },
  terms: { href: "/terms-of-service", label: "Terms of Service" },
};

export function LegalLinks({
  className,
  onNavigate,
  order = "privacy-first",
  separator = " · ",
}: LegalLinksProps) {
  const orderedKeys: LegalLinkKey[] = order === "terms-first"
    ? ["terms", "privacy"]
    : ["privacy", "terms"];

  return (
    <span className={["legal-links", className].filter(Boolean).join(" ")}>
      {orderedKeys.map((key, index) => {
        const destination = destinations[key];

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
