# Browser security policy

ProjectScout generates a fresh Content Security Policy nonce in `proxy.ts` for
every dynamic request. The policy is forwarded to Next.js during rendering so
the framework can apply the nonce to its scripts and styles, and the same policy
is returned to the browser.

## Allowed browser origins

Browser code communicates with ProjectScout itself and the exact origin parsed
from `NEXT_PUBLIC_SUPABASE_URL`. Supabase is required for login, signup, session
refresh, password recovery, and password updates. AI providers and the database
remain server-only and are therefore not CSP browser connection sources.

No wildcard network, script, style, frame, or form sources are allowed. External
links such as the issue tracker and privacy regulator are ordinary top-level
navigations and do not require CSP source entries.

Development permits `unsafe-eval` for React diagnostics and `unsafe-inline` for
development styles, as recommended by the installed Next.js documentation.
Neither is present in production.

## Other response protections

Production responses include a two-year HSTS policy with subdomains and the
preload directive. Deploy only on a domain whose subdomains are HTTPS-capable.
All environments receive strict referrer, browser feature, MIME-sniffing,
same-origin opener, and same-origin resource policies. Framing is blocked with
the CSP `frame-ancestors 'none'` directive.

`Cross-Origin-Embedder-Policy` is intentionally omitted. ProjectScout does not
need cross-origin isolation, and enabling it would add compatibility requirements
to Supabase responses without providing a feature the application uses.

## Deployment verification

After deployment, inspect `/`, `/research`, `/auth/confirm`, and an API response.
Confirm the security headers are present, each HTML response has a different
nonce, and the nonce in the CSP matches the nonce on rendered Next.js scripts.
Exercise login, signup confirmation, password recovery, and one research request
against the deployment's disposable Supabase test account before promoting it.
