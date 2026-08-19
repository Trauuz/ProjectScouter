# ProjectScout

ProjectScout researches a project topic with Tavily, then asks Gemini to
turn the retrieved evidence into three scoped product recommendations. Source
records and AI interpretation remain separate throughout the pipeline so the UI
can show exactly what supports each recommendation.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Add server-side `RESEARCH_API_KEY`, `RECOMMENDATION_API_KEY`, and database
   connection values.
4. Add the Supabase project URL and publishable key as
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. Run `npm run dev`, then open `http://localhost:3000`.

The publishable Supabase key identifies the Auth project and is intentionally
available to the browser. Database connection strings and research provider
keys remain server-only and must never use a `NEXT_PUBLIC_` prefix. Configure
the development Site URL and redirect allowlist in Supabase Auth for
`http://localhost:3000` and `http://localhost:3000/auth/confirm`.

The active providers and model are selected with `RESEARCH_PROVIDER`,
`RECOMMENDATION_PROVIDER`, and `RECOMMENDATION_MODEL`. Change the model value to
switch models without changing application code. Environment variables
intentionally do not use the `NEXT_PUBLIC_` prefix, so neither provider key is
included in the browser bundle.

Provider SDKs are isolated in `server/research/infrastructure`. To add another
recommendation provider, implement the existing `RecommendationProvider` port,
add its name to `provider-settings.ts`, and register its constructor in
`provider-factory.ts`. The research use case, API route, response contract, and
UI do not need to change.

The previous `PERPLEXITY_API_KEY`, `OPENAI_API_KEY`, and
`OPENAI_RECOMMENDATION_MODEL` names remain accepted as migration aliases. New
deployments should use the neutral names from `.env.example`.

## Research flow

The landing-page form opens `/research?prompt=...`. Authentication is required
before the research workspace posts the prompt to `/api/research`, where a
Node.js route:

1. validates the Supabase session, then validates and bounds the request;
2. retrieves current public evidence from Perplexity;
3. normalizes and filters source URLs;
4. generates exactly three structured recommendations with OpenAI; and
5. returns source-linked JSON without caching it.

Provider failures are sanitized before they reach the browser. No provider
response is rendered as HTML.

## Security boundary

- Research, recommendation, and database credentials stay in server-only
  environment variables. Only the Supabase project URL and publishable Auth key
  are exposed to the browser.
- The research API validates the Supabase user server-side before rate limiting
  or invoking a provider. Client-supplied user or visitor IDs are never trusted.
- Requests require JSON, enforce same-origin browser calls, cap body and prompt
  sizes, and have an overall timeout.
- The included limiter allows five requests per ten minutes per process. This
  protects local and single-instance deployments. Multi-instance or serverless
  production deployments must replace `MemoryRateLimiter` with a shared store
  or enforce an equivalent limit at the deployment edge.
- Retrieved pages are treated as untrusted evidence. Their text cannot select
  tools, reveal secrets, or alter the recommendation schema.
- Only public HTTP(S) sources are returned; loopback, private-network, local-file,
  and duplicate/tracking URLs are rejected.
- The current feature stores no user-owned objects and accepts no object IDs, so
  there is no IDOR surface. If saved reports or accounts are added, every read
  and write must authenticate the user and enforce ownership server-side.

## Verification

Run:

```bash
npm test
npm run lint
npm run build
npm audit
```
