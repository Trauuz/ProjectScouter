import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/shared/layout/site-footer";
import { SiteHeader } from "@/shared/layout/site-header";
import { PROJECTSCOUT_OPERATOR } from "@/shared/legal/legal-identity";

import styles from "../privacy-policy/privacy-policy.module.css";

export const metadata: Metadata = {
  title: "Cookie Policy | ProjectScout",
  description:
    "The cookies and browser storage ProjectScout uses, why they are necessary, and how to control them.",
};

const policySections = [
  { id: "current-use", title: "Current Use" },
  { id: "necessary-cookies", title: "Necessary Cookies" },
  { id: "browser-storage", title: "Browser Storage" },
  { id: "analytics-and-embeds", title: "Analytics and Embeds" },
  { id: "consent", title: "Consent" },
  { id: "controls-and-contact", title: "Controls and Contact" },
] as const;

export default function CookiePolicyPage() {
  return (
    <div className={styles.shell}>
      <SiteHeader />

      <main className={styles.main}>
        <header className={styles.intro}>
          <h1>Cookie Policy</h1>
          <p className={styles.updated}>
            Last updated: <time dateTime="2026-09-08">September 8, 2026</time>
          </p>
          <p className={styles.lede}>
            ProjectScout currently uses only storage needed to provide requested
            account and research features.
          </p>
        </header>

        <div className={styles.document}>
          <nav className={styles.contents} aria-label="Cookie policy contents">
            <p>On this page</p>
            <ol>
              {policySections.map((section) => (
                <li key={section.id}>
                  <a href={"#" + section.id}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className={styles.policy}>
            <section id="current-use">
              <h2>Current Use</h2>
              <p>
                This page covers cookies and similar browser technologies used by
                ProjectScout. A cookie is a small value stored by your browser and
                sent with later requests. Local storage stays in the browser and is
                not automatically sent with every request.
              </p>
              <p>
                ProjectScout does not currently use advertising, behavioural
                profiling, cross-site tracking, or optional analytics storage.
              </p>
            </section>

            <section id="necessary-cookies">
              <h2>Necessary Cookies</h2>
              <p>
                When you create an account or log in, Supabase authentication may set
                one or more secure session cookies, commonly using a name beginning
                with <code>sb-</code> and ending in <code>-auth-token</code>. They
                keep you signed in, refresh your session, and protect access to your
                account. Their exact names and expiry can vary with the configured
                Supabase project and session.
              </p>
              <p>
                These cookies are used only when needed for the account or session
                you request. You can remove the browser session data by signing out
                or using your browser controls.
              </p>
            </section>

            <section id="browser-storage">
              <h2>Browser Storage</h2>
              <ul>
                <li>
                  <strong>Recent research history:</strong> up to 20 prompts and
                  completed results are kept locally so you can reopen them. They
                  remain until you remove an item or clear site data.
                </li>
                <li>
                  <strong>Pending authentication request:</strong> a prompt and the
                  action you requested may be kept for up to about 30 minutes so the
                  service can continue after login or email confirmation.
                </li>
              </ul>
              <p>
                Do not include personal, sensitive, or confidential information in a
                research prompt. See the <Link href="/privacy-policy">Privacy Policy</Link>
                {" "}for server-side processing and retention.
              </p>
            </section>

            <section id="analytics-and-embeds">
              <h2>Analytics and Embeds</h2>
              <p>
                ProjectScout does not currently load an analytics platform, ad pixel,
                social-media widget, video embed, or other third-party embed in the
                browser. Research and AI providers receive requests from the server;
                they are not embedded trackers on these pages.
              </p>
            </section>

            <section id="consent">
              <h2>Consent</h2>
              <p>
                ProjectScout is operated from the Philippines and does not show a
                cookie-consent banner in its current necessary-only, no-tracking
                setup. If the service is specifically offered in a jurisdiction that
                requires consent for any of this browser storage, or if optional
                analytics, advertising, or other non-essential storage is introduced,
                affected storage will remain off until any required consent is
                obtained. This policy will also be updated.
              </p>
            </section>

            <section id="controls-and-contact">
              <h2>Controls and Contact</h2>
              <p>
                You can remove individual research items in ProjectScout. You can
                also block or clear cookies and site data in your browser, although
                blocking necessary storage can prevent login and saved-history
                features from working.
              </p>
              <p>
                Questions may be sent to{" "}
                <a href={"mailto:" + PROJECTSCOUT_OPERATOR.email}>
                  {PROJECTSCOUT_OPERATOR.email}
                </a>
                .
              </p>
            </section>
          </article>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
