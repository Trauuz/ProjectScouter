"use client";

import Link from "next/link";
import { useRef } from "react";

import { useAuth } from "@/features/auth";

import { AccountMenu } from "./account-menu";

const navigation = [
  { href: "/#how-it-works", label: "Process" },
  { href: "/#evidence", label: "Evidence" },
  { href: "/#directions", label: "Directions" },
];

type SiteHeaderProps = {
  hideNavigationLinks?: boolean;
};

function WordmarkContent() {
  return (
    <>
      <span className="wordmark__mark" aria-hidden="true">
        <span />
        <span />
      </span>
      <span>ProjectScout</span>
    </>
  );
}

export function SiteHeader({ hideNavigationLinks = false }: SiteHeaderProps) {
  const auth = useAuth();
  const mobileNavigation = useRef<HTMLDetailsElement>(null);

  function closeMobileNavigation() {
    if (mobileNavigation.current) {
      mobileNavigation.current.open = false;
    }
  }

  const unauthenticatedActions = (
    <div className="site-auth-actions">
      <button
        className="site-auth-actions__login"
        type="button"
        onClick={() => auth.openAuth("login", { kind: "open_research" })}
      >
        Log in
      </button>
      <button
        className="button"
        type="button"
        onClick={() => auth.openAuth("signup", { kind: "open_research" })}
      >
        Sign up for free
      </button>
    </div>
  );

  const accountMenu = auth.user ? (
    <AccountMenu user={auth.user} onSignOut={auth.signOut} />
  ) : null;

  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="ProjectScout home">
        <WordmarkContent />
      </Link>

      {!hideNavigationLinks && (
        <nav className="site-nav" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      <div className="site-header__action">
        {auth.user ? accountMenu : unauthenticatedActions}
      </div>

      <details className="mobile-nav" ref={mobileNavigation}>
        <summary>Menu</summary>
        <nav aria-label="Mobile navigation">
          {!hideNavigationLinks &&
            navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileNavigation}
              >
                {item.label}
              </Link>
            ))}
          {auth.user ? accountMenu : unauthenticatedActions}
        </nav>
      </details>
    </header>
  );
}
