# ProjectScout restore-drill checklist

Use a disposable Supabase project. Never restore a drill over production.

## Preparation

- [ ] Assign the on-call operator and a second reviewer.
- [ ] Record drill start time, source backup timestamp, expected RPO, and RTO.
- [ ] Verify the selected backup appears in Supabase and is within retention.
- [ ] Record whether PITR is enabled and its earliest/latest recovery points.
- [ ] Confirm temporary secrets will be stored only in the deployment secret manager.
- [ ] Disable or isolate restored cron jobs, webhooks, wrappers, and other outbound integrations.

## Restore

- [ ] Restore the chosen backup or PITR point to a new disposable project.
- [ ] Recreate required non-database settings without copying values into this record.
- [ ] Apply migrations with `npm run db:migrate`.
- [ ] Verify migration consistency with `npm run db:check`.
- [ ] Deploy an isolated application instance against the restored project.

## Validate

- [ ] `/api/health/live` returns `200` and `{"status":"alive"}`.
- [ ] `/api/health/ready` returns `200` and `{"status":"ready"}`.
- [ ] A disposable user can sign up, log in, log out, and recover a password.
- [ ] Tenant isolation and anonymous-run claiming behave correctly.
- [ ] A reservation completes once on success and releases once on failure.
- [ ] Research persistence is idempotent and account deletion completes.
- [ ] Aggregate row counts and schema version match the selected recovery point.
- [ ] Health responses contain no credentials, internal hosts, or dependency details.

## Closeout

- [ ] Record achieved RPO and RTO, including the first successful readiness time.
- [ ] Record gaps and assign owners and due dates.
- [ ] Obtain reviewer sign-off.
- [ ] Revoke temporary credentials and delete the disposable project.
- [ ] Store sanitized evidence in the restricted operations record.
