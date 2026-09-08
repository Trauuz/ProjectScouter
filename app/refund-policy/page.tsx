import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/shared/layout/site-footer";
import { SiteHeader } from "@/shared/layout/site-header";
import { PROJECTSCOUT_OPERATOR } from "@/shared/legal/legal-identity";

import styles from "../privacy-policy/privacy-policy.module.css";

export const metadata: Metadata = {
  title: "Refund Policy | ProjectScout",
  description:
    "ProjectScout's current payment and refund position, and how future paid services will be handled.",
};

const policySections = [
  { id: "current-service", title: "Current Service" },
  { id: "future-paid-features", title: "Future Paid Features" },
  { id: "mandatory-rights", title: "Mandatory Rights" },
  { id: "billing-errors", title: "Billing Errors" },
  { id: "contact", title: "Contact" },
] as const;

export default function RefundPolicyPage() {
  return (
    <div className={styles.shell}>
      <SiteHeader />

      <main className={styles.main}>
        <header className={styles.intro}>
          <h1>Refund Policy</h1>
          <p className={styles.updated}>
            Last updated: <time dateTime="2026-09-08">September 8, 2026</time>
          </p>
          <p className={styles.lede}>
            ProjectScout currently provides free research credits and does not
            accept payments.
          </p>
        </header>

        <div className={styles.document}>
          <nav className={styles.contents} aria-label="Refund policy contents">
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
            <section id="current-service">
              <h2>Current Service</h2>
              <p>
                ProjectScout does not currently sell subscriptions, research
                credits, digital products, or other paid services. Because no payment
                is collected, there is presently no purchase to cancel or refund.
                Free credits have no cash value and cannot be exchanged for money.
              </p>
            </section>

            <section id="future-paid-features">
              <h2>Future Paid Features</h2>
              <p>
                If ProjectScout introduces a paid feature, the price, billing period,
                renewal terms, cancellation method, and refund terms will be shown
                before you authorize a charge. This policy and the{" "}
                <Link href="/terms-of-service">Terms of Service</Link> will be updated
                before payments are accepted.
              </p>
            </section>

            <section id="mandatory-rights">
              <h2>Mandatory Rights</h2>
              <p>
                Nothing in this policy limits a refund, repair, replacement, or other
                remedy that cannot lawfully be excluded under applicable consumer law.
                Any future paid-service terms will be applied together with those
                mandatory rights.
              </p>
            </section>

            <section id="billing-errors">
              <h2>Billing Errors</h2>
              <p>
                ProjectScout does not currently have a checkout or payment processor.
                If a charge nevertheless appears to identify ProjectScout, contact us
                promptly with the date, amount, currency, and a redacted description.
                Do not email a full card number, bank credential, password, or one-time
                code.
              </p>
            </section>

            <section id="contact">
              <h2>Contact</h2>
              <p>
                Send payment or refund questions to{" "}
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
