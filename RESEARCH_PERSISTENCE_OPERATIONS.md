# Research persistence contract

ProjectScout uses an explicit partial-success contract. Generated research is not
reported as saved until the normalized research tables contain it.

## HTTP outcomes

- `200`: the report is materialized in the research tables and its usage
  reservation is completed.
- `202`: the report is durably staged in `research_persistence_jobs`, but final
  materialization failed. The response includes a `retryId`, a user-facing
  message, and a **Retry saving** action. Retrying calls
  `POST /api/research/persistence/{retryId}` and does not invoke either AI
  provider again.
- `503 PERSISTENCE_UNAVAILABLE`: even durable staging failed, so the server does
  not claim to hold a safe copy. The usage reservation is released and the user
  is told to retry the research request.

The browser may cache the report for presentation and reload support, but browser
storage is never the basis for the `saved` status.

## Idempotency and usage

The persistence job UUID is also the final research-run UUID. Research-run insert
uses `ON CONFLICT DO NOTHING` and verifies that an existing row has the same
owner. Repeated or simultaneous retries therefore converge on one research run.
Sources, recommendations, job completion, and usage-reservation completion are
idempotent.

The usage reservation remains `pending` while the job is retryable. It becomes
`completed` only after the normalized run is present. Provider, cancellation,
timeout, malformed-output, or durable-staging failures use the existing release
path. Account deletion removes staged reports before usage records.

## Operations and metrics

Structured events contain identifiers, timings, phases, and error types but no
prompt, report body, SQL, provider output, connection string, or user ID:

- `research.persistence.staged`
- `research.persistence.materialized`
- `research.persistence.retryable_failure`
- `research.persistence.failed`
- `research.persistence.retry_request_failed`

Alert on sustained `retryable_failure` events or old pending jobs. Operators can
inspect counts without retrieving report content:

```sql
select status, count(*), min(created_at) as oldest
from projectscout.research_persistence_jobs
group by status;
```

`pending` and `retryable_failed` are safe to retry. `completed` records may be
retained for idempotency while their research run exists. User/account deletion
removes every job belonging to that user. A future retention cleanup must not
delete a pending job or release its reservation until the product has explicitly
defined when the generated report is considered abandoned.
