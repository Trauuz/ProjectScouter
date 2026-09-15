# Automated testing

Run every automated suite with:

```sh
npm test
```

This runs unit/API tests, disposable embedded-PostgreSQL integration tests, and
Playwright browser tests. It does not use Supabase, the production database, or
paid AI APIs. Browser tests intercept the configured local Supabase origin and
application API requests with deterministic fixtures.

Other quality commands are:

```sh
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:coverage
npm run typecheck
npm run lint
npm run build
npm run validate
```

`npm run validate` is the complete pre-release check: lint, types, all tests,
and the production build. The build still requires the documented production
environment variables; test commands provide no production credentials.

## Test data and isolation

Database integration tests create an in-memory PGlite database, apply the real
Drizzle migrations, use random UUIDs, and destroy the database after the suite.
Playwright creates a new browser context per test and uses reserved `.test`
email addresses plus deterministic provider reports. No test is allowed to
route requests to Tavily, Gemini, OpenAI, Perplexity, or a remote Supabase host.

## Coverage policy

Coverage focuses on security, billing, authorization, persistence, and deletion
logic rather than generated files or framework composition glue. Global gates
start at 50% lines/statements, 45% functions, and 40% branches. The lower global
gate accounts for browser-only adapters while route handlers and security-critical
modules are substantially higher. Raise thresholds as behavior is added; do not
add trivial assertions solely to increase a number.
