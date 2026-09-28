# Automated testing

Run every automated suite with:

```sh
npm test
```

This runs the Playwright browser tests. It does not use Supabase, the production
database, or paid AI APIs. Browser tests intercept the configured local Supabase
origin and application API requests with deterministic fixtures.

Other quality commands are:

```sh
npm run test:e2e
npm run eval:release
npm run usage:summary:daily
npm run usage:summary:monthly
npm run typecheck
npm run lint
npm run build
npm run validate
```

`npm run validate` is the complete pre-release check: lint, types, all tests,
and the production build. The build still requires the documented production
environment variables; test commands provide no production credentials.

## Test data and isolation

Playwright creates a new browser context per test and uses reserved `.test`
email addresses plus deterministic provider reports. No test is allowed to
route requests to Tavily, Gemini, OpenAI, Perplexity, or a remote Supabase host.

The offline AI evaluation suite and release threshold are documented in
`AI_EVALUATION.md`. `npm run validate` runs that gate after all automated test
suites; it emits versioned, machine-readable results without contacting any
provider.

Operational configuration and reconciliation are documented in
`PROVIDER_USAGE_OPERATIONS.md`.
