CREATE TYPE "projectscout"."account_deletion_audit_event" AS ENUM('request_recorded', 'access_revoked', 'authentication_deleted', 'application_data_deleted', 'retryable_failure', 'completed');--> statement-breakpoint
CREATE TYPE "projectscout"."account_deletion_status" AS ENUM('pending', 'retryable_failed', 'completed');--> statement-breakpoint
CREATE TYPE "projectscout"."account_deletion_step" AS ENUM('revoke_access', 'delete_authentication', 'delete_application_data', 'complete');--> statement-breakpoint
CREATE TABLE "projectscout"."account_deletion_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"event" "projectscout"."account_deletion_audit_event" NOT NULL,
	"step" "projectscout"."account_deletion_step" NOT NULL,
	"error_code" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projectscout"."account_deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"status" "projectscout"."account_deletion_status" DEFAULT 'pending' NOT NULL,
	"next_step" "projectscout"."account_deletion_step" DEFAULT 'revoke_access' NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"last_error_code" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projectscout"."account_deletion_audit_events" ADD CONSTRAINT "account_deletion_audit_events_request_id_account_deletion_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "projectscout"."account_deletion_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_deletion_audit_events_request_idx" ON "projectscout"."account_deletion_audit_events" USING btree ("request_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "account_deletion_requests_user_uidx" ON "projectscout"."account_deletion_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_deletion_requests_retry_idx" ON "projectscout"."account_deletion_requests" USING btree ("status","next_attempt_at");--> statement-breakpoint
ALTER TABLE "projectscout"."account_deletion_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "projectscout"."account_deletion_requests" FROM PUBLIC;--> statement-breakpoint
CREATE POLICY "server_only_deny_all"
ON "projectscout"."account_deletion_requests"
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING (false)
WITH CHECK (false);--> statement-breakpoint
ALTER TABLE "projectscout"."account_deletion_audit_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "projectscout"."account_deletion_audit_events" FROM PUBLIC;--> statement-breakpoint
CREATE POLICY "server_only_deny_all"
ON "projectscout"."account_deletion_audit_events"
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING (false)
WITH CHECK (false);
