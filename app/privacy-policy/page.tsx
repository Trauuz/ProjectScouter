import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/shared/layout/site-footer";
import { SiteHeader } from "@/shared/layout/site-header";
import { PROJECTSCOUT_OPERATOR } from "@/shared/legal/legal-identity";

import styles from "./privacy-policy.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | ProjectScout",
  description:
    "How ProjectScout collects, uses, stores, and shares information when you use the service.",
};

const policySections = [
  { id: "operator-and-scope", title: "Operator and Scope" },
  { id: "data-and-purposes", title: "Data and Purposes" },
  { id: "providers-and-sharing", title: "Providers and Sharing" },
  { id: "storage-cookies-and-retention", title: "Storage, Cookies, and Retention" },
  { id: "lawful-bases", title: "Lawful Bases" },
  { id: "security-and-breaches", title: "Security and Breaches" },
  { id: "your-rights-and-children", title: "Your Rights and Children" },
  { id: "changes-and-contact", title: "Changes and Contact" },
] as const;

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.shell}>
      <SiteHeader />

      <main className={styles.main}>
        <header className={styles.intro}>
          <h1>Privacy Policy</h1>
          <p className={styles.updated}>
            Last updated: <time dateTime="2026-09-08">September 8, 2026</time>
          </p>
          <p className={styles.lede}>
            This policy explains the personal data ProjectScout handles and your
            choices.
          </p>
        </header>

        <div className={styles.document}>
          <nav className={styles.contents} aria-label="Privacy policy contents">
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
            <section id="operator-and-scope">
              <h2>Operator and Scope</h2>
              <p>
                {PROJECTSCOUT_OPERATOR.name} operates ProjectScout and is the
                personal information controller for account, usage, and research data
                handled for the service. This policy follows the Philippine Data
                Privacy Act of 2012 (Republic Act No. 10173), its implementing rules,
                and applicable National Privacy Commission issuances.
              </p>
            </section>

            <section id="data-and-purposes">
              <h2>Data and Purposes</h2>
              <p>ProjectScout processes:</p>
              <ul>
                <li>
                  your email address, account identifier, authentication data, and
                  session information to create and secure your account;
                </li>
                <li>
                  research prompts and any information you include in them to perform
                  your request;
                </li>
                <li>
                  research summaries, source titles, URLs, snippets, recommendations,
                  evidence links, timestamps, and status to provide and restore results;
                </li>
                <li>
                  a user or visitor identifier and credit usage to associate research,
                  enforce limits, and prevent abuse; and
                </li>
                <li>
                  basic request, device, IP address, and security-log information
                  processed by infrastructure providers to deliver and protect the
                  service.
                </li>
              </ul>
              <p>
                ProjectScout does not ask for your name, postal address, phone
                number, contacts, precise location, or payment details. A hosting or
                security provider may still process an IP address and basic request
                metadata as needed to operate and protect the service.
              </p>
              <p>
                Supabase processes passwords and ProjectScout does not receive a
                readable copy. Do not put sensitive, confidential, or third-party
                personal information in a prompt unless it is necessary, lawful, and
                you are authorized to disclose it.
              </p>
            </section>

            <section id="providers-and-sharing">
              <h2>Providers and Sharing</h2>
              <ul>
                <li>
                  <strong>Supabase</strong> receives account and authentication data
                  for signup, login, email confirmation, password recovery, and
                  sessions.
                </li>
                <li>
                  <strong>Perplexity or Tavily</strong> receives your prompt to
                  research public sources. ProjectScout asks these providers to use
                  aggregate patterns and avoid collecting identifiable details about
                  individuals.
                </li>
                <li>
                  <strong>OpenAI or Google Gemini</strong> receives your prompt,
                  research summary, and collected public-source evidence to generate
                  recommendations.
                </li>
                <li>
                  <strong>Database, hosting, network, and security providers</strong>
                  process stored records, service traffic, configuration, and logs
                  needed to operate ProjectScout.
                </li>
                <li>
                  <strong>GitHub</strong> receives a bug report only if you choose to
                  continue to GitHub, review the pre-filled public issue, and submit
                  it there. Do not include personal or confidential information.
                </li>
              </ul>
              <p>
                The configured providers may process data outside the Philippines
                under their own terms and privacy practices. ProjectScout shares only
                what is needed for these functions, a legal requirement, safety, or a
                transfer of the service. We do not sell personal information or use it
                for targeted advertising.
              </p>
            </section>

            <section id="storage-cookies-and-retention">
              <h2>Storage, Cookies, and Retention</h2>
              <p>
                ProjectScout stores account-linked prompts, research results, sources,
                recommendations, timestamps, and monthly usage in its database. Your
                browser stores up to 20 recent prompts and completed results. A pending
                authentication request may remain in browser storage for about 30
                minutes.
              </p>
              <p>
                Necessary authentication cookies maintain your Supabase session.
                ProjectScout does not currently use optional analytics storage,
                advertising cookies, browser fingerprinting, or third-party embeds.
                The <Link href="/cookie-policy">Cookie Policy</Link> lists the current
                cookies and browser storage in more detail.
              </p>
              <p>
                Server records are retained while reasonably needed to provide and
                protect the service, meet legal obligations, or resolve disputes; the
                current system has no fixed automatic deletion period. Browser history
                remains until you remove it or clear site data. Removing an item in the
                interface deletes the browser copy only. You may request deletion of
                server data, subject to lawful exceptions.
              </p>
              <p>
                ProjectScout limits local history to 20 entries and limits prompts to
                500 characters. We periodically review the information collected and
                aim not to retain fields that are unnecessary for account security,
                research delivery, saved history, usage limits, or legal obligations.
              </p>
            </section>

            <section id="lawful-bases">
              <h2>Lawful Bases</h2>
              <p>
                Depending on the activity, processing is necessary to provide the
                service or perform our agreement with you, comply with law, protect
                legitimate interests that do not override your rights, or act on your
                consent. Creating an account does not make consent the legal basis for
                every necessary processing activity. Sensitive personal information is
                processed only with specific consent or another basis permitted by
                Philippine law.
              </p>
            </section>

            <section id="security-and-breaches">
              <h2>Security and Breaches</h2>
              <p>
                We use reasonable administrative, technical, and organizational
                safeguards, including access controls, Supabase authentication,
                transport security, and server-side storage of provider and database
                credentials. No online service can guarantee complete security.
              </p>
              <p>
                We assess suspected personal data breaches, take reasonable steps to
                contain them, and notify the National Privacy Commission and affected
                people within the applicable period when Philippine law requires
                notification.
              </p>
            </section>

            <section id="your-rights-and-children">
              <h2>Your Rights and Children</h2>
              <p>
                Under the Data Privacy Act, you may have rights to be informed, object,
                access, correct, erase or block, obtain portable data, claim damages,
                and file a complaint. We may verify your identity and may retain
                information where law permits or requires it. You may also complain to
                the{" "}
                <a href="https://privacy.gov.ph/">
                  National Privacy Commission
                </a>
                .
              </p>
              <p>
                ProjectScout is not directed to children under 13 and does not
                knowingly collect their personal data. Contact us if you believe a
                child has provided data so we can review and delete it where
                appropriate.
              </p>
            </section>

            <section id="changes-and-contact">
              <h2>Changes and Contact</h2>
              <p>
                We may update this policy by posting a revised version and changing
                the date above. Additional notice will be provided when appropriate or
                required by law.
              </p>
              <p>
                For privacy questions, complaints, or requests, email{" "}
                <a href={"mailto:" + PROJECTSCOUT_OPERATOR.email}>
                  {PROJECTSCOUT_OPERATOR.email}
                </a>{" "}
                with the subject &quot;Privacy Request — ProjectScout.&quot;
              </p>
            </section>
          </article>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
