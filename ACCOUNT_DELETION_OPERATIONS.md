# Account deletion configuration and operations

Account deletion requires `SUPABASE_SERVICE_ROLE_KEY`. Obtain the service-role
secret from the target project's Supabase Dashboard under **Project Settings →
API Keys**. Store it in the hosting platform's encrypted environment-variable or
secret-manager settings. Never place it in a `NEXT_PUBLIC_` variable, committed
file, client-side setting, build log, or support ticket.

Set `ACCOUNT_DELETION_WORKER_SECRET` to an independently generated random value
of at least 32 characters in the same server-only secret manager. Configure the
platform scheduler to send `POST /api/internal/account-deletions` with that value
as a bearer token. Local secret values belong in ignored `.env.local` files.

`npm run validate:deployment` loads production environment files using Next.js's
normal precedence, validates required variables, and prints only variable names
and pass/fail status. `npm run build` and `npm start` invoke this check before
building or serving. The post-build check scans `.next/static` and fails if the
service-role value appears in a browser asset; it never prints the value.

## Retry and retention

Deletion first stores a durable request, which revokes application access. It
then deletes the Supabase Auth user, deletes account-linked application rows, and
marks completion. A failure stores the next retryable step and a sanitized error
code. Jobs become eligible for the protected retry worker after five minutes.
The worker returns deletion request IDs, stages, and sanitized codes, never user
IDs, emails, prompts, research results, or secrets.

The Supabase user UUID is retained only while unfinished work needs it. Completion
nulls the UUID. Minimal job and audit metadata currently have no automatic expiry.

## Disposable-user smoke test

Use an isolated Supabase test project, never production:

1. Configure its URL, publishable key, service-role key, database, and a random
   worker secret through the test deployment's secret manager.
2. Create a uniquely named disposable Auth user and one research result, then
   record the generated user and research IDs in the temporary test run only.
3. Submit `DELETE /api/account` twice while the session is valid. Confirm both
   calls refer to one durable deletion request and that research is blocked as
   soon as the request exists.
4. To exercise recovery, temporarily block the test deployment's outbound Auth
   admin call. Confirm the job is `retryable_failed`, the Auth user and application
   research still exist, and no secret or personal content appears in logs.
5. Restore connectivity and invoke the protected retry endpoint. Confirm the Auth
   user and application rows are gone, the job is completed with `user_id` null,
   and its audit events contain only operational metadata.
6. Invoke the retry endpoint again and confirm the completed job and counters do
   not change. Remove any disposable test-project artifacts that remain.
