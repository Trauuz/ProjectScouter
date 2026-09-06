import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/shared/layout/site-footer";
import { SiteHeader } from "@/shared/layout/site-header";
import { PROJECTSCOUT_OPERATOR } from "@/shared/legal/legal-identity";

import styles from "../privacy-policy/privacy-policy.module.css";

export const metadata: Metadata = {
  title: "Terms of Service | ProjectScout",
  description:
    "The terms that govern access to and use of the ProjectScout research service.",
};

const termsSections = [
  { id: "agreement-and-eligibility", title: "Agreement and Eligibility" },
  { id: "service-and-limits", title: "Service and Limits" },
  { id: "accounts-and-content", title: "Accounts and Content" },
  { id: "acceptable-use", title: "Acceptable Use" },
  { id: "ai-results", title: "AI Results" },
  { id: "ownership", title: "Ownership" },
  { id: "availability-and-termination", title: "Availability and Termination" },
  { id: "disclaimers-and-liability", title: "Disclaimers and Liability" },
  { id: "law-changes-and-contact", title: "Law, Changes, and Contact" },
] as const;

export default function TermsOfServicePage() {
  return (
    <div className={styles.shell}>
      <SiteHeader />

      <main className={styles.main}>
        <header className={styles.intro}>
          <h1>Terms of Service</h1>
          <p className={styles.updated}>
            Last updated: <time dateTime="2026-09-06">September 6, 2026</time>
          </p>
          <p className={styles.lede}>
            These Terms govern your use of ProjectScout.
          </p>
        </header>

        <div className={styles.document}>
          <nav className={styles.contents} aria-label="Terms of service contents">
            <p>On this page</p>
            <ol>
              {termsSections.map((section) => (
                <li key={section.id}>
                  <a href={"#" + section.id}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className={styles.policy}>
            <section id="agreement-and-eligibility">
              <h2>Agreement and Eligibility</h2>
              <p>
                These Terms are an agreement between you and{" "}
                {PROJECTSCOUT_OPERATOR.name}, the operator of ProjectScout. By
                creating an account or using ProjectScout, you agree to these Terms
                and the <Link href="/privacy-policy">Privacy Policy</Link>. If you
                use the service for an organization, you confirm that you can accept
                these Terms for it.
              </p>
              <p>
                You must be at least 13. If you have not reached the age of majority
                where you live, a parent or legal guardian must review and accept
                these Terms for you.
              </p>
            </section>

            <section id="service-and-limits">
              <h2>Service and Limits</h2>
              <p>
                ProjectScout researches public sources and uses AI to turn a project
                prompt into three evidence-backed project directions. You are
                responsible for reviewing and verifying results before using them.
              </p>
              <p>
                Registered users currently receive 10 free research credits per
                calendar month, resetting at the beginning of each month in UTC.
                Credits do not roll over or have cash value. Provider capacity,
                maintenance, security controls, or technical failures may affect
                availability. We may change free limits or add paid features; any
                price and payment terms will be shown before a charge is made.
              </p>
            </section>

            <section id="accounts-and-content">
              <h2>Accounts and Content</h2>
              <p>
                Provide accurate account information, protect your credentials, and
                notify us if you suspect unauthorized use. You are responsible for
                activity under your account.
              </p>
              <p>
                You keep any rights you hold in your prompts. You give ProjectScout
                permission to host, process, store, and transmit them only as needed
                to provide, secure, and operate the service. Submit only content you
                have the right to use, and do not include sensitive, confidential, or
                third-party personal information unless you are authorized to do so.
              </p>
            </section>

            <section id="acceptable-use">
              <h2>Acceptable Use</h2>
              <p>You may not use ProjectScout to:</p>
              <ul>
                <li>violate law or another person’s rights;</li>
                <li>facilitate harm, fraud, deception, or discrimination;</li>
                <li>submit malware or interfere with the service;</li>
                <li>bypass access controls, usage limits, or security measures;</li>
                <li>probe systems without written authorization;</li>
                <li>misrepresent your identity or generated content; or</li>
                <li>automate requests in a way that overloads or abuses the service.</li>
              </ul>
            </section>

            <section id="ai-results">
              <h2>AI Results</h2>
              <p>
                AI-generated research can be inaccurate, incomplete, outdated, biased,
                or similar to output provided to others. Citations do not guarantee
                that every generated statement is supported. Verify important claims
                and do not treat results as legal, medical, financial, or other
                professional advice. You are responsible for decisions and work based
                on the results.
              </p>
            </section>

            <section id="ownership">
              <h2>Ownership</h2>
              <p>
                ProjectScout’s software, interface, branding, prompts, and service
                materials belong to {PROJECTSCOUT_OPERATOR.name} or the applicable
                licensors. These Terms allow you to use the service but do not transfer
                ownership. Public sources and third-party materials remain subject to
                their own rights and terms.
              </p>
            </section>

            <section id="availability-and-termination">
              <h2>Availability and Termination</h2>
              <p>
                ProjectScout may change, suspend, or discontinue features and does not
                guarantee uninterrupted or error-free service. You may stop using the
                service at any time. We may suspend or terminate access to address a
                violation, security risk, legal requirement, or material harm. Terms
                that must survive termination, including ownership, disclaimers,
                liability, and dispute provisions, remain effective.
              </p>
            </section>

            <section id="disclaimers-and-liability">
              <h2>Disclaimers and Liability</h2>
              <p>
                To the maximum extent permitted by law, ProjectScout is provided
                &quot;as is&quot; and &quot;as available&quot; without warranties of
                merchantability, fitness for a particular purpose, non-infringement,
                accuracy, or availability.
              </p>
              <p>
                To the maximum extent permitted by law, ProjectScout, its operator,
                and its providers are not liable for indirect, incidental, special,
                consequential, exemplary, or punitive damages, or for lost profits,
                data, goodwill, or opportunities. Total aggregate liability will not
                exceed the fees you paid for ProjectScout in the 12 months before the
                claim, or PHP 1,000 if you paid no fees.
              </p>
              <p>
                These limits do not apply where prohibited by law, including liability
                that cannot be excluded for fraud, willful misconduct, or gross
                negligence. To the extent permitted by law, you agree to indemnify
                ProjectScout and its operator against third-party claims caused by your
                content, misuse of the service, or violation of these Terms or another
                person’s rights.
              </p>
            </section>

            <section id="law-changes-and-contact">
              <h2>Law, Changes, and Contact</h2>
              <p>
                Philippine law governs these Terms. Before filing a court action, the
                parties will try in good faith to resolve the dispute by email for 30
                days, without limiting access to urgent relief or a government agency.
                Any unresolved claim may be brought before a Philippine court with
                lawful jurisdiction and venue.
              </p>
              <p>
                We may update these Terms by posting the revised version and changing
                the date above. We will provide additional notice when required by law.
                Continued use after the effective date means you accept the updated
                Terms.
              </p>
              <p>
                Questions or legal notices may be sent to{" "}
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
