import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/shared/layout/site-footer";
import { SiteHeader } from "@/shared/layout/site-header";

import styles from "../privacy-policy/privacy-policy.module.css";

export const metadata: Metadata = {
  title: "Terms of Service | ProjectScout",
  description:
    "The terms that govern access to and use of the ProjectScout research service.",
};

const LEGAL_CONTACT_EMAIL = "tristancarabbacan06@gmail.com";

const termsSections = [
  { id: "acceptance-of-terms", title: "Acceptance of Terms" },
  { id: "eligibility", title: "Eligibility" },
  { id: "account-registration", title: "Account Registration" },
  { id: "account-responsibilities", title: "Account Responsibilities" },
  { id: "use-of-the-service", title: "Use of the Service" },
  {
    id: "user-content-and-research-prompts",
    title: "User Content and Research Prompts",
  },
  {
    id: "ai-generated-content-and-research-results",
    title: "AI-Generated Content and Research Results",
  },
  { id: "acceptable-use", title: "Acceptable Use" },
  { id: "philippine-law-compliance", title: "Philippine Law Compliance" },
  { id: "intellectual-property", title: "Intellectual Property" },
  { id: "third-party-services", title: "Third-Party Services" },
  { id: "service-availability", title: "Service Availability" },
  { id: "privacy", title: "Privacy" },
  { id: "disclaimers", title: "Disclaimers" },
  { id: "limitation-of-liability", title: "Limitation of Liability" },
  { id: "indemnification", title: "Indemnification" },
  {
    id: "account-suspension-and-termination",
    title: "Account Suspension and Termination",
  },
  { id: "changes-to-the-terms", title: "Changes to the Terms" },
  { id: "governing-law", title: "Governing Law and Disputes" },
  { id: "contact-information", title: "Contact Information" },
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
            These Terms explain the rules for using ProjectScout, including your
            responsibilities when submitting prompts and working with AI-generated
            research results.
          </p>
        </header>

        <div className={styles.document}>
          <nav className={styles.contents} aria-label="Terms of service contents">
            <p>On this page</p>
            <ol>
              {termsSections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className={styles.policy}>
            <section id="acceptance-of-terms">
              <h2>Acceptance of Terms</h2>
              <p>
                These Terms of Service form an agreement between you and the operator
                of ProjectScout. By accessing the website, creating an account, or
                using the research service, you agree to these Terms and the linked
                Privacy Policy. If you do not agree, do not use the service.
              </p>
            </section>

            <section id="eligibility">
              <h2>Eligibility</h2>
              <p>
                You must be legally able to enter into this agreement. If you are under
                the age of majority where you live, a parent or legal guardian must
                review and accept these Terms on your behalf. ProjectScout is not
                directed to children under 13.
              </p>
              <p>
                If you use ProjectScout for an organization, you represent that you
                have authority to accept these Terms for that organization.
              </p>
            </section>

            <section id="account-registration">
              <h2>Account Registration</h2>
              <p>
                Some features require an account. You must provide accurate, current
                information and keep it up to date. We may require email confirmation
                before enabling account features. You may not create an account using
                another person’s identity or an email address you are not authorized
                to use.
              </p>
            </section>

            <section id="account-responsibilities">
              <h2>Account Responsibilities</h2>
              <p>
                You are responsible for activity under your account and for protecting
                your credentials. Use a unique password, do not share access, and tell
                us promptly if you suspect unauthorized use. We are not responsible for
                losses caused by your failure to secure your account unless applicable
                law provides otherwise.
              </p>
            </section>

            <section id="use-of-the-service">
              <h2>Use of the Service</h2>
              <p>
                ProjectScout accepts a project topic, researches relevant public
                sources, and generates evidence-backed project directions. You may use
                the service only in accordance with these Terms and applicable law.
                You are responsible for reviewing results before relying on, sharing,
                publishing, or acting on them.
              </p>
            </section>

            <section id="user-content-and-research-prompts">
              <h2>User Content and Research Prompts</h2>
              <p>
                You retain any rights you already hold in prompts and other content you
                submit. You grant ProjectScout a non-exclusive, worldwide,
                royalty-free license to host, reproduce, process, and transmit that
                content only as needed to provide, secure, and maintain the service.
              </p>
              <p>
                You represent that you have the rights and permissions needed to submit
                your content. Do not include passwords, regulated records, confidential
                material, or another person’s personal information unless you are
                authorized to use and disclose it for this purpose.
              </p>
            </section>

            <section id="ai-generated-content-and-research-results">
              <h2>AI-Generated Content and Research Results</h2>
              <p>
                ProjectScout uses automated systems and third-party providers to search,
                summarize, and generate recommendations. Results may be incomplete,
                inaccurate, outdated, biased, or similar to content produced for other
                users. A citation does not guarantee that a source supports every
                generated statement.
              </p>
              <p>
                Treat results as a starting point, not professional advice. Verify
                important claims and obtain qualified legal, financial, medical, or
                other professional advice when a decision requires it. Your use of a
                result must respect applicable law and third-party rights.
              </p>
            </section>

            <section id="acceptable-use">
              <h2>Acceptable Use</h2>
              <p>You may not use ProjectScout to:</p>
              <ul>
                <li>break the law or facilitate harm, fraud, or deception;</li>
                <li>infringe intellectual-property, privacy, or other rights;</li>
                <li>submit malware or interfere with the service or another user;</li>
                <li>bypass access controls, rate limits, or security measures;</li>
                <li>probe or test systems without written authorization;</li>
                <li>misrepresent your identity or the origin of generated content;</li>
                <li>automatically extract or overload the service beyond normal use; or</li>
                <li>help another person do anything prohibited by these Terms.</li>
              </ul>
            </section>

            <section id="intellectual-property">
              <h2>Intellectual Property</h2>
              <p>
                ProjectScout and its software, interface, branding, documentation, and
                other service materials are owned by the ProjectScout operator or its
                licensors and are protected by applicable intellectual-property laws.
                These Terms give you a limited, revocable, non-transferable right to use
                the service; they do not transfer ownership of ProjectScout technology
                or branding to you.
              </p>
              <p>
                Public sources linked in research results remain subject to their own
                rights and terms. ProjectScout does not grant you rights in third-party
                articles, websites, products, marks, or other materials.
              </p>
            </section>

            <section id="third-party-services">
              <h2>Third-Party Services</h2>
              <p>
                ProjectScout relies on third parties for authentication, web research,
                recommendation generation, hosting, databases, and network services.
                It may also link to public websites. Those services have their own
                terms and privacy practices, and ProjectScout does not control their
                content, availability, or independent conduct.
              </p>
            </section>

            <section id="service-availability">
              <h2>Service Availability</h2>
              <p>
                We may change, limit, suspend, or discontinue features to maintain
                security, comply with law, respond to provider changes, or improve the
                service. We do not promise that ProjectScout will always be available,
                uninterrupted, error-free, or compatible with every device or browser.
              </p>
            </section>

            <section id="privacy">
              <h2>Privacy</h2>
              <p>
                The <Link href="/privacy-policy">Privacy Policy</Link> explains how
                ProjectScout collects, uses, stores, and shares information. It is part
                of these Terms, and you should review it before creating an account or
                submitting a research prompt.
              </p>
            </section>

            <section id="disclaimers">
              <h2>Disclaimers</h2>
              <p>
                To the maximum extent permitted by law, ProjectScout is provided “as
                is” and “as available.” We disclaim implied warranties of
                merchantability, fitness for a particular purpose, non-infringement,
                and any warranty arising from course of dealing or usage of trade. We
                do not warrant that research results are complete, accurate, original,
                or suitable for a particular decision.
              </p>
              <p>
                Some jurisdictions do not allow certain warranty exclusions, so parts
                of this section may not apply to you.
              </p>
            </section>

            <section id="limitation-of-liability">
              <h2>Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, the ProjectScout operator and
                its suppliers will not be liable for indirect, incidental, special,
                consequential, exemplary, or punitive damages, or for lost profits,
                data, goodwill, or business opportunities arising from the service or
                these Terms.
              </p>
              <p>{LIABILITY_CAP_PLACEHOLDER}</p>
              <p>
                Applicable law may give you rights that cannot be limited by contract.
                In that case, these limits apply only to the extent the law permits.
              </p>
            </section>

            <section id="indemnification">
              <h2>Indemnification</h2>
              <p>
                To the extent permitted by law, you agree to defend, indemnify, and hold
                harmless the ProjectScout operator and its personnel from third-party
                claims, losses, and reasonable costs arising from your submitted
                content, your misuse of the service, or your violation of these Terms
                or another person’s rights. This obligation does not apply where the
                claim results from ProjectScout’s own unlawful conduct.
              </p>
            </section>

            <section id="account-suspension-and-termination">
              <h2>Account Suspension and Termination</h2>
              <p>
                You may stop using ProjectScout at any time. We may suspend or terminate
                access when reasonably necessary to address a Terms violation, security
                risk, legal requirement, or material harm to ProjectScout, its
                providers, or users. Where practical, we will provide notice and an
                opportunity to address the issue.
              </p>
              <p>
                Terms that by their nature should survive termination—including
                intellectual-property, disclaimer, liability, indemnification, and
                dispute provisions—will remain in effect.
              </p>
            </section>

            <section id="changes-to-the-terms">
              <h2>Changes to the Terms</h2>
              <p>
                We may update these Terms as the service or law changes. We will post
                the revised Terms here and update the date above. If a change materially
                affects your rights, we will provide additional notice when appropriate.
                Continued use after the revised Terms take effect means you accept them,
                except where law requires another form of consent.
              </p>
            </section>

            <section id="governing-law">
              <h2>Governing Law</h2>
              <p>{GOVERNING_LAW_PLACEHOLDER}</p>
              <p>
                Nothing in these Terms removes consumer protections or other rights
                that cannot be waived under the law that applies to you.
              </p>
            </section>

            <section id="contact-information">
              <h2>Contact Information</h2>
              <p>
                Questions about these Terms can be sent to{" "}
                <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
                This is ProjectScout’s official legal contact address.
              </p>
            </section>
          </article>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
