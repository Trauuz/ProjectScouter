import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__mast">
        <p className="site-footer__wordmark">ProjectScout</p>
        <p className="site-footer__tagline">
          Better project ideas begin with better evidence.
        </p>
      </div>
      <div className="site-footer__meta">
        <nav aria-label="Footer navigation">
          <Link href="/">Home</Link>
          <Link href="/research">Start research</Link>
        </nav>
      </div>
    </footer>
  );
}
