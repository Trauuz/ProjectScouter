CREATE TYPE "projectscout"."research_persistence_job_status" AS ENUM('pending', 'retryable_failed', 'completed');--> statement-breakpoint
CREATE TABLE "projectscout"."research_persistence_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid,
	"usage_reservation_id" uuid,
	"report" jsonb NOT NULL,
	"status" "projectscout"."research_persistence_job_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "projectscout"."research_persistence_jobs" ADD CONSTRAINT "research_persistence_jobs_usage_reservation_id_usage_reservations_id_fk" FOREIGN KEY ("usage_reservation_id") REFERENCES "projectscout"."usage_reservations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "research_persistence_jobs_usage_reservation_uidx" ON "projectscout"."research_persistence_jobs" USING btree ("usage_reservation_id");--> statement-breakpoint
CREATE INDEX "research_persistence_jobs_status_updated_idx" ON "projectscout"."research_persistence_jobs" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "research_persistence_jobs_user_idx" ON "projectscout"."research_persistence_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "research_persistence_jobs_session_idx" ON "projectscout"."research_persistence_jobs" USING btree ("session_id");
--> statement-breakpoint
ALTER TABLE "projectscout"."research_persistence_jobs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "projectscout"."research_persistence_jobs" FROM PUBLIC;
--> statement-breakpoint
CREATE POLICY "server_only_deny_all"
ON "projectscout"."research_persistence_jobs"
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING (false)
WITH CHECK (false);
