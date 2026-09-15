# Database connection operations

ProjectScout has no committed provider-specific hosting manifest. Its production
entry point is a Next.js server, so the checked-in defaults assume an autoscaling
or serverless deployment. Use the Supabase **Transaction pooler** connection
string from **Dashboard > Connect** for `DATABASE_URL`. It uses port `6543` and
requires prepared statements to be disabled; the application does that whenever
`DATABASE_CONNECTION_MODE=transaction_pooler`.

Supabase recommends transaction mode for serverless workloads and direct
connections for persistent IPv6 backends. A persistent IPv4-only backend can use
the session pooler. Migrations must use `DATABASE_MIGRATION_URL`, normally a
direct connection, rather than the runtime pooler URL.

References:

- [Supabase: Connect to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase: Connection pooling and limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits)
- [Supabase: Compute connection limits](https://supabase.com/docs/guides/platform/compute-and-disk)

## Required production settings

The deployment validator requires every runtime pool setting. It reports variable
names, never connection strings or secret values.

| Variable | Safe baseline | Meaning |
| --- | ---: | --- |
| `DATABASE_CONNECTION_MODE` | `transaction_pooler` | `transaction_pooler`, `session_pooler`, or `direct` |
| `DATABASE_RUNTIME` | `serverless` | `serverless` or `long_lived` |
| `DATABASE_POOL_MAX` | `4` | Maximum client connections per application instance |
| `DATABASE_CONNECT_TIMEOUT_SECONDS` | `10` | Maximum time to establish a connection |
| `DATABASE_IDLE_TIMEOUT_SECONDS` | `20` | Close an idle client connection after this interval |
| `DATABASE_MAX_LIFETIME_SECONDS` | `1800` | Recycle a client connection after this interval |
| `DATABASE_SHUTDOWN_TIMEOUT_SECONDS` | `5` | Graceful drain limit for a long-lived process |
| `DATABASE_CONNECTION_BUDGET` | `60` | Project database connection ceiling for its Supabase compute size |
| `DATABASE_MAX_APP_INSTANCES` | `10` | Hard deployment autoscaling ceiling used for budgeting |
| `DATABASE_RESERVED_CONNECTIONS` | `10` | Connections unavailable to web application instances |
| `DATABASE_SSL_MODE` | `require` | Supabase endpoints must use `require` |

The baseline uses the Nano/Micro database ceiling of 60 connections. Confirm the
current value in the Supabase compute documentation and project dashboard before
deployment. If the hosting platform cannot enforce the configured maximum number
of instances, use a conservative upper bound or reduce the per-instance pool.

## Budget calculation

Use these definitions:

```text
usable application connections = database connection budget - reserved connections
maximum pool size = floor(usable application connections / maximum app instances)
maximum app instances = floor(usable application connections / pool size)
```

For the checked-in baseline, `60 - 10 = 50` connections are available. Ten
instances with pools of four can open at most 40, leaving another ten connections
of headroom. With a pool of four, the mathematical ceiling is 12 instances, but
the deployment ceiling remains 10. Startup validation rejects any configuration
where `pool size × instances` exceeds `budget − reserved`.

Reserve enough capacity for Supabase platform services, migrations, operator
sessions, scheduled jobs, and incident investigation. Ten is a conservative
minimum for Nano/Micro; increase it when other direct database consumers exist.
This calculation deliberately counts every application-side pool slot against the
database budget even though transaction pooling can multiplex backend sessions.
That makes the guard conservative rather than dependent on traffic timing.

Supabase's general serverless guidance starts at one client connection per warm
instance and recommends increasing only after observing queuing. ProjectScout uses
four because usage reservation and completed-research persistence are concurrent,
transactional request paths. Do not raise it without checking acquisition-time
telemetry and recalculating the deployment ceiling.

## Telemetry and lifecycle

The database is a process-wide singleton, so warm instances reuse one client
pool. Transaction callbacks emit structured events for connection acquisition
time and active leased connections. Direct and transactional failures emit a
`database.query.failed` event containing only the failure phase and error type;
SQL text, parameters, URLs, user IDs, and error messages are excluded.

Long-lived runtimes drain the client on `SIGINT` and `SIGTERM`. Serverless
runtimes rely on bounded idle and maximum-lifetime settings because providers may
freeze rather than terminate an instance cleanly.

## Concurrency validation results

The deterministic test suite covers both critical write paths:

- Usage reservation starts six simultaneous requests against a five-credit
  account. Exactly five reserve successfully, one is rejected, and all application
  counters remain consistent.
- Research persistence starts eight simultaneous completed-run transactions. All
  eight receive unique run IDs and the probe observes more than one transaction in
  flight.
- Pool telemetry starts two overlapping transactions and observes two active
  leases, then returns to zero and records a simulated query failure.

These are correctness and concurrency tests, not a latency benchmark against a
specific Supabase region. Their assumptions are a four-connection application
pool, ten maximum warm instances, and a 60-connection database budget with ten
reserved. Before a major traffic increase, repeat a staging load test against a
disposable Supabase project in the deployment region and record p50/p95 acquisition
time, query error rate, active leases, and Supavisor client/backend connection
metrics. Never run write load against production user data.
