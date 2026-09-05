import type { Metadata } from "next";

import { SiteFooter } from "@/shared/layout/site-footer";
import { SiteHeader } from "@/shared/layout/site-header";

import styles from "./privacy-policy.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | ProjectScout",
  description:
    "How ProjectScout collects, uses, stores, and shares information when you use the service.",
};

const PRIVACY_CONTACT_EMAIL = "tristancarabbacan06@gmail.com";

const policySections = [
  { id: "information-we-collect", title: "Information We Collect" },
  { id: "how-we-use-information", title: "How We Use Information" },
  { id: "account-information", title: "Account Information" },
  {
    id: "research-prompts-and-user-content",
    title: "Research Prompts and User Content",
  },
  { id: "how-we-store-information", title: "How We Store Information" },
  {
    id: "cookies-and-similar-technologies",
    title: "Cookies and Similar Technologies",
  },
  { id: "third-party-services", title: "Third-Party Services" },
  { id: "data-sharing", title: "Data Sharing" },
  { id: "data-security", title: "Data Security" },
  { id: "data-retention", title: "Data Retention" },
  { id: "user-rights-and-choices", title: "User Rights and Choices" },
  { id: "childrens-privacy", title: "Children’s Privacy" },
  {
    id: "changes-to-this-privacy-policy",
    title: "Changes to This Privacy Policy",
  },
  { id: "contact-information", title: "Contact Information" },
] as const;

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.shell}>
      <SiteHeader />

      <main className={styles.main}>
        <header className={styles.intro}>
          <h1>Privacy Policy</h1>
          <p className={styles.updated}>
            Last updated: <time dateTime="2026-08-25">August 25, 2026</time>
          </p>
          <p className={styles.lede}>
            ProjectScout turns a project prompt into evidence-backed research
            directions. This policy explains what information the service handles,
            why it is used, and the choices available to you.
          </p>
        </header>

        <div className={styles.document}>
          <nav className={styles.contents} aria-label="Privacy policy contents">
            <p>On this page</p>
            <ol>
              {policySections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className={styles.policy}>
            <section id="information-we-collect">
              <h2>Information We Collect</h2>
              <p>
                We collect information you provide directly, including your email
                address, research prompts, and the content you choose to submit. We
                also create service data such as research results, cited sources,
                project directions, timestamps, and an identifier used to associate
                research with your browser session or account.
              </p>
              <p>
                The service may also receive basic technical information needed to
                deliver and protect the website, such as request metadata, browser
                type, device information, and IP address. ProjectScout does not ask
                you to provide sensitive personal information in a research prompt.
              </p>
            </section>

            <section id="how-we-use-information">
              <h2>How We Use Information</h2>
              <p>We use information to:</p>
              <ul>
                <li>create and manage your account;</li>
                <li>run the research you request and generate project directions;</li>
                <li>save, restore, and organize your research history;</li>
                <li>maintain, secure, troubleshoot, and prevent misuse of the service;</li>
                <li>respond to support or privacy requests; and</li>
                <li>understand and improve ProjectScout’s reliability and usefulness.</li>
              </ul>
            </section>

            <section id="account-information">
              <h2>Account Information</h2>
              <p>
                ProjectScout uses Supabase to provide account registration, login,
                email confirmation, password recovery, and session management. We
                receive your account identifier and email address from that service.
                Your password is submitted to and processed by the authentication
                provider; ProjectScout does not receive a readable copy of it.
              </p>
            </section>

            <section id="research-prompts-and-user-content">
              <h2>Research Prompts and User Content</h2>
              <p>
                Your prompt and relevant research material are sent to the providers
                needed to perform your request. Those providers may use the prompt to
                search public sources, summarize evidence, and generate structured
                recommendations. Research results can include links, excerpts, and
                summaries derived from public websites.
              </p>
              <p>
                Do not submit passwords, financial account details, health records,
                confidential business information, or personal information about
                another person unless you have a lawful reason and permission to do
                so. You remain responsible for the content you submit and for how you
                use generated results.
              </p>
            </section>

            <section id="how-we-store-information">
              <h2>How We Store Information</h2>
              <p>
                Account-linked research runs, prompts, summaries, sources, and project
                recommendations are stored in ProjectScout’s database. Your browser
                also keeps a local copy of recent prompt history and completed results
                so the workspace can restore them quickly. A pending research request
                may be held briefly in local browser storage while authentication is
                completed.
              </p>
              <p>
                Information stored locally remains on the device and browser profile
                where it was created unless you remove it or clear that browser’s site
                data.
              </p>
            </section>

            <section id="cookies-and-similar-technologies">
              <h2>Cookies and Similar Technologies</h2>
              <p>
                ProjectScout uses necessary cookies and browser storage to maintain
                authentication, recognize a research session, preserve recent research
                history, and resume a request after signup or login. The visitor-session
                cookie is HTTP-only, uses SameSite=Lax, and is configured to expire
                after one year. A pending authentication request expires after about
                30 minutes.
              </p>
              <p>
                The current service does not intentionally use advertising cookies or
                sell browser activity for targeted advertising. You can clear cookies
                and local storage in your browser, but doing so may sign you out or
                remove locally saved history.
              </p>
            </section>

            <section id="third-party-services">
              <h2>Third-Party Services</h2>
              <p>ProjectScout relies on service providers in these categories:</p>
              <ul>
                <li>
                  <strong>Authentication:</strong> Supabase.
                </li>
                <li>
                  <strong>Web research:</strong> Perplexity or Tavily, depending on
                  the service configuration.
                </li>
                <li>
                  <strong>Recommendation generation:</strong> OpenAI or Google Gemini,
                  depending on the service configuration.
                </li>
                <li>
                  <strong>Infrastructure:</strong> database, hosting, network, and
                  security providers used to operate ProjectScout.
                </li>
              </ul>
              <p>
                These providers process information under their own terms and privacy
                practices. ProjectScout sends them only the information reasonably
                needed for the requested function.
              </p>
            </section>

            <section id="data-sharing">
              <h2>Data Sharing</h2>
              <p>
                We do not sell personal information. We may share information with the
                service providers described above, when you direct us to do so, to
                comply with law or protect rights and safety, or as part of a merger,
                financing, acquisition, or transfer of the service. If ownership
                changes, this policy or a replacement notice will describe how your
                information is handled.
              </p>
            </section>

            <section id="data-security">
              <h2>Data Security</h2>
              <p>
                We use reasonable administrative, technical, and organizational
                safeguards designed to protect information. These include access
                controls, secure authentication, transport encryption where supported,
                and separation of service credentials from browser code. No online
                service can guarantee complete security, so please use a unique password
                and avoid placing sensitive information in prompts.
              </p>
            </section>

            <section id="data-retention">
              <h2>Data Retention</h2>
              <p>
                We retain account and research information for as long as reasonably
                needed to provide the service, protect it, meet legal obligations, and
                resolve disputes. Local prompt history remains until you remove it in
                ProjectScout or clear the browser’s site data. Removing a local history
                item does not necessarily delete a server-stored research run.
              </p>
              <p>
                When information is no longer needed, we take reasonable steps to
                delete or de-identify it. Limited copies may remain temporarily in
                backups, security records, or logs. You can request deletion using the
                contact information below.
              </p>
            </section>

            <section id="user-rights-and-choices">
              <h2>User Rights and Choices</h2>
              <p>
                Depending on where you live, you may have rights to request access,
                correction, deletion, restriction, objection, or a portable copy of
                personal information. You may also have the right to appeal a decision
                or complain to your local data-protection authority.
              </p>
              <p>
                You can manage browser-stored information through ProjectScout and your
                browser controls. For account-level access, correction, or deletion,
                contact us. We may need to verify your identity before completing a
                request, and some information may be retained where law permits or
                requires it.
              </p>
            </section>

            <section id="childrens-privacy">
              <h2>Children’s Privacy</h2>
              <p>
                ProjectScout is not directed to children under 13, and we do not
                knowingly collect personal information from them. If you believe a
                child has provided personal information, contact us so we can review
                and delete it where appropriate. If local law sets a higher minimum
                age, use the service only with the authorization required in your
                location.
              </p>
            </section>

            <section id="changes-to-this-privacy-policy">
              <h2>Changes to This Privacy Policy</h2>
              <p>
                We may update this policy as ProjectScout changes. We will post the
                revised version on this page and change the “Last updated” date. If a
                change materially affects how we use personal information, we will
                provide additional notice when appropriate.
              </p>
            </section>

            <section id="contact-information">
              <h2>Contact Information</h2>
              <p>
                Questions or privacy requests can be sent to{" "}
                <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>
                  {PRIVACY_CONTACT_EMAIL}
                </a>
                . This is a placeholder contact address and should be replaced with
                ProjectScout’s official privacy address before production launch.
              </p>
            </section>
          </article>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
