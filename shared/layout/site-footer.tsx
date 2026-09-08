import Link from "next/link";

import { LegalLinks } from "@/shared/legal/legal-links";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__mast">
        <p className="site-footer__wordmark">ProjectScout</p>
        <p className="site-footer__tagline">
          Project ideas shaped by public-source research.
        </p>
      </div>
      <div className="site-footer__meta">
        <nav aria-label="Footer navigation">
          <Link href="/">Home</Link>
          <Link href="/research">Start research</Link>
        </nav>
        <div className="site-footer__legal-block">
          <LegalLinks
            className="site-footer__legal"
            keys={["privacy", "cookies", "terms", "refunds"]}
          />
          <small>© {new Date().getUTCFullYear()} ProjectScout</small>
        </div>
      </div>
    </footer>
  );
}
