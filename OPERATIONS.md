# ProjectScout operations runbook

## Health and traffic admission

- `GET /api/health/live` proves that the application process can serve HTTP. It
  never checks the database, Supabase, or an AI provider. A `200` response with
  `{"status":"alive"}` means the process should not be restarted solely for
  health reasons.
- `GET /api/health/ready` controls traffic admission. It validates required
  production configuration and runs the read-only PostgreSQL query `SELECT 1`.
  Every check has a 1.5-second deadline. `200` with `{"status":"ready"}` admits
  traffic; `503` with `{"status":"unavailable"}` removes the instance from
  service and asks the caller to retry after five seconds.
- Both endpoints are uncached. Public responses intentionally omit dependency
  names, hostnames, credentials, exception messages, and topology. Detailed
  check names and failure categories are emitted only through the restricted
  structured server log stream, correlated by the response `x-correlation-id`.
- Routine probes never call Tavily, Perplexity, Gemini, OpenAI, or any other
  paid API. Provider configuration is validated locally. A runtime provider
  outage returns a sanitized `503` with `Retry-After: 30`, releases the usage
  reservation, and leaves the retry action available in the research UI.

Recommended deployment settings are a liveness interval of 30 seconds with a
three-failure threshold and a readiness interval of 10 seconds with a
three-failure threshold. Do not use readiness failures as a restart signal.

## Backup and recovery policy

ProjectScout's production database must run on a paid Supabase project with
managed physical backups. Supabase creates daily backups for Pro, Team, and
Enterprise projects. The production operator must verify the backup timestamp
and retention in **Dashboard → Database → Backups** before every release.

| Control | ProjectScout policy |
| --- | --- |
| Backup mechanism | Supabase-managed daily physical database backup. Before destructive maintenance, create and verify an additional logical `supabase db dump` or `pg_dump` in encrypted operator-controlled storage. |
| Retention | Minimum seven daily restore points. Supabase currently provides 7 days on Pro, 14 days on Team, and up to 30 days on Enterprise. Logical pre-maintenance exports are retained for 30 days. |
| PITR availability | Supabase offers Point-in-Time Recovery as a paid add-on for Pro, Team, and Enterprise projects with eligible compute. It is deployment-controlled, not enabled by this repository. If the operator has not recorded it as enabled, treat PITR as unavailable. |
| Recovery-point objective | 24 hours with daily backups. Target two minutes only for deployments where PITR is enabled and its latest recovery point has been verified. |
| Recovery-time objective | Four hours from incident declaration to a validated service restoration. This is an internal objective; actual Supabase restore duration varies with database size and WAL volume. |
| Responsible operator | The on-call ProjectScout production operator owns backup verification, incident command, restore approval, validation, and the drill record. A second operator reviews destructive production restores. |

Supabase's current backup and retention behavior is documented at
<https://supabase.com/docs/guides/platform/backups>. Restoring into a separate
project is documented at <https://supabase.com/docs/guides/platform/clone-project>.

## Restore procedure

1. Declare an incident, name the on-call operator, record the desired recovery
   point, and stop writes by removing application instances from traffic.
2. Confirm whether the incident needs a daily restore or an enabled PITR point.
   Select a point immediately before the first known corrupting event.
3. Prefer **Restore to a New Project** from the Supabase backup page. This keeps
   the source intact for investigation. For a logical export, create a disposable
   Supabase project and restore with the documented `psql`/`pg_restore` workflow.
4. Reapply deployment-managed settings that database restoration does not copy:
   Auth settings, API keys, SMTP, network restrictions, environment secrets,
   Storage objects, Realtime settings, and external integrations. Never copy a
   production secret into the drill record.
5. Apply the repository migrations with `npm run db:migrate`, then run
   `npm run db:check`.
6. Point an isolated ProjectScout deployment at the restored project. Confirm
   liveness and readiness, then run the database integration and smoke suites.
7. Validate schema version, aggregate row counts, authentication with a
   disposable user, tenant isolation, usage reservation, research persistence,
   and account deletion. Do not inspect or export raw user prompts.
8. For a production cutover, obtain second-operator approval, update secret
   references and connection strings, deploy, wait for readiness, and then
   restore traffic gradually. Retain the original project until validation and
   the rollback window are complete.
9. Record actual recovery point, data-loss window, recovery duration, failed
   checks, and follow-up actions. Revoke temporary credentials and delete the
   disposable restore after the evidence is approved.

Run the checklist in [RESTORE_DRILL.md](RESTORE_DRILL.md) at least quarterly and
after changing the database plan, backup mode, or recovery procedure.
