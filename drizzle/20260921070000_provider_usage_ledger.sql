CREATE TYPE "projectscout"."provider_operation" AS ENUM('research', 'recommendation');--> statement-breakpoint
CREATE TYPE "projectscout"."provider_call_status" AS ENUM('pending', 'completed', 'failed', 'timed_out', 'cancelled');--> statement-breakpoint
CREATE TABLE "projectscout"."provider_usage_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"internal_request_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"usage_reservation_id" uuid,
	"user_id" uuid,
	"provider" text NOT NULL,
	"operation" "projectscout"."provider_operation" NOT NULL,
	"model_or_mode" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"status" "projectscout"."provider_call_status" DEFAULT 'pending' NOT NULL,
	"provider_request_id" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"estimated_cost_microdollars" bigint DEFAULT 0 NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "projectscout"."provider_usage_ledger" ADD CONSTRAINT "provider_usage_ledger_usage_reservation_id_usage_reservations_id_fk" FOREIGN KEY ("usage_reservation_id") REFERENCES "projectscout"."usage_reservations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_usage_ledger_idempotency_operation_uidx" ON "projectscout"."provider_usage_ledger" USING btree ("idempotency_key","operation");--> statement-breakpoint
CREATE INDEX "provider_usage_ledger_reservation_idx" ON "projectscout"."provider_usage_ledger" USING btree ("usage_reservation_id");--> statement-breakpoint
CREATE INDEX "provider_usage_ledger_started_provider_idx" ON "projectscout"."provider_usage_ledger" USING btree ("started_at","provider");--> statement-breakpoint
CREATE INDEX "provider_usage_ledger_user_started_idx" ON "projectscout"."provider_usage_ledger" USING btree ("user_id","started_at");--> statement-breakpoint
ALTER TABLE "projectscout"."provider_usage_ledger" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "projectscout"."provider_usage_ledger" FROM PUBLIC;--> statement-breakpoint
CREATE POLICY "server_only_deny_all"
ON "projectscout"."provider_usage_ledger"
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING (false)
WITH CHECK (false);
