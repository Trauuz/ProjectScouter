"use client";

import Link from "next/link";
import { useRef } from "react";

import { useAuth } from "@/features/auth";

const navigation = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#evidence", label: "Evidence" },
];

export function SiteHeader() {
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
    <details className="account-menu">
      <summary aria-label={`Account menu for ${auth.user.email}`}>
        <span aria-hidden="true">{auth.user.initials}</span>
      </summary>
      <div>
        <p>{auth.user.email}</p>
        <button type="button" onClick={() => void auth.signOut()}>
          Log out
        </button>
      </div>
    </details>
  ) : null;

  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="ProjectScout home">
        <span className="wordmark__mark" aria-hidden="true">
          <span />
          <span />
        </span>
        <span>ProjectScout</span>
      </Link>

      <nav className="site-nav" aria-label="Primary navigation">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="site-header__action">
        <Link
          className="button site-header__research-link"
          href="/research"
        >
          Open research
        </Link>
        {auth.user ? accountMenu : unauthenticatedActions}
      </div>

      <details className="mobile-nav" ref={mobileNavigation}>
        <summary>Menu</summary>
        <nav aria-label="Mobile navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobileNavigation}
            >
              {item.label}
            </Link>
          ))}
          <Link
            className="button site-header__research-link"
            href="/research"
            onClick={closeMobileNavigation}
          >
            Open research
          </Link>
          {auth.user ? accountMenu : unauthenticatedActions}
        </nav>
      </details>
    </header>
  );
}
