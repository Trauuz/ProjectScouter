# Provider usage ledger operations

## Purpose and data model

Every billable research and recommendation call is linked to one application
operation in `projectscout.provider_usage_ledger`. The row is written before the
provider is called and finalized afterward. It records the internal request and
idempotency IDs, optional authenticated account ID, usage reservation, provider,
model or search mode, timestamps, terminal status, provider request ID when the
provider returns one, tokens or credits, estimated cost, and retry count.

The table is server-only under PostgreSQL row-level security. It does not store
API keys, authorization headers, prompts, source snippets, or provider response
bodies. Application logs use the existing structured redaction layer and do not
emit account IDs from ledger summaries.

One unique row is allowed for each `(idempotency_key, operation)` pair. A repeat
`begin` returns the existing row and the provider wrapper suppresses another
billable request. Completion and failure updates apply only while a row is
pending, so retries cannot replace recorded usage or add cost twice.

Clients may send a UUID in the `Idempotency-Key` request header. ProjectScout
hashes it together with the authenticated account or anonymous visitor scope;
the raw client key and visitor credential are not stored. Reusing the same key
for the same owner suppresses another provider call. Without the header, the
server uses the usage reservation ID, or a generated internal request ID for an
anonymous operation.

Research persistence reconciles the linked usage reservation before completing
it. Both `research` and `recommendation` entries must be completed. If ledger
reconciliation is incomplete, persistence stays retryable and the user's usage
reservation is not completed.

## Required configuration

All ceilings and prices are validated before production starts. The ignored
local `.env` contains every variable required by the validator. Values ending in
`MICRODOLLARS` are integer millionths of one US dollar; token prices are
microdollars per one million tokens. This avoids floating-point money
calculations.

- `ACCOUNT_MONTHLY_RESEARCH_LIMIT` protects each account.
- `RESEARCH_PROVIDER_MONTHLY_CREDIT_CEILING` and
  `RESEARCH_PROVIDER_CREDITS_PER_CALL` protect search/research capacity.
- `RECOMMENDATION_PROVIDER_DAILY_CALL_CEILING` protects generation capacity.
- daily and monthly spend ceilings bound estimated aggregate spend.
- `PROVIDER_USAGE_WARNING_PERCENT` must be below 100 so warnings arrive before
  exhaustion.
- request, input-token, output-token, and credit price variables must match the
  currently selected provider plan and model.

Review official provider pricing whenever a provider, model, search mode, or
contract changes. Change configuration through the deployment secret/config
manager, validate it in staging, and record the source and effective date in the
release ticket. A zero price means the operator intentionally treats that usage
dimension as free; it is not an unknown-price sentinel.

The preflight counters remain deliberately conservative. They reserve provider
capacity before concurrent work starts, while the ledger records what actually
happened. Search/recommendation capacity is not returned after a provider call
fails because the upstream service may still have charged it. User credits are
released under the existing reservation lifecycle when the overall operation
fails.

## Alerts

Structured warnings are emitted as:

- `provider.quota.warning` when research credits or recommendation calls reach
  the configured warning percentage;
- `provider.spend_velocity.warning` when spend projected from the current UTC
  day reaches the warning percentage of the daily ceiling;
- `provider.monthly_spend.warning` when actual month-to-date estimated spend
  reaches the warning percentage.

Route these JSON events from standard application logs to the deployment's
existing log alert mechanism. Page the responsible operator if utilization is
at or above 95%, projected spend exceeds its ceiling, warnings persist for two
checks, or provider failures coincide with quota warnings. At the first warning:

1. Compare the daily and monthly summaries with the provider dashboard.
2. Check for a request spike, repeated idempotency failures, or changed pricing.
3. Reduce traffic or lower the configured preflight ceilings if reconciliation
   is uncertain.
4. Raise a ceiling only after confirming the provider quota and approved spend
   budget; never change the stored ledger to silence an alert.

## Daily and monthly summaries

Run these from an authorized operator environment with server database
configuration:

```sh
npm run usage:summary:daily
npm run usage:summary:monthly
```

Each command emits one machine-readable JSON record containing UTC period
bounds, request/completion/failure counts, tokens, credits, estimated cost, and
per-provider totals. It contains no account IDs or prompts. Schedule both
commands in deployment automation: daily shortly after 00:00 UTC and monthly on
the first day after the daily summary. Retain summaries with operational logs
according to the application's log-retention policy.

Reconcile total provider request IDs, tokens/credits, and estimated cost against
provider invoices or quota dashboards. Differences can occur when a provider
does not return usage on failed requests or bills with rounding rules that
differ from ProjectScout's conservative per-call rounding. Record unexplained
differences in the incident log and update pricing configuration prospectively;
do not rewrite historical ledger rows.

## Migration and recovery

Migration `20260921070000_provider_usage_ledger.sql` creates the enums, table,
indexes, foreign key, and server-only policy. The ledger is included in normal
database backups and restore drills. After a restore, compare its latest
completed timestamp and daily summary with the provider dashboard before
re-enabling research traffic. Pending rows are evidence of uncertain calls and
must be investigated rather than automatically marked completed.
