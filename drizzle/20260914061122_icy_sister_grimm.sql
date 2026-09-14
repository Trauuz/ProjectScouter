CREATE TYPE "projectscout"."usage_reservation_status" AS ENUM('pending', 'completed', 'released');--> statement-breakpoint
CREATE TABLE "projectscout"."usage_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_period_start" date NOT NULL,
	"status" "projectscout"."usage_reservation_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "usage_reservations_user_period_status_idx" ON "projectscout"."usage_reservations" USING btree ("user_id","account_period_start","status");
--> statement-breakpoint
ALTER TABLE "projectscout"."usage_reservations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "projectscout"."usage_reservations" FROM PUBLIC;
--> statement-breakpoint
CREATE POLICY "server_only_deny_all"
ON "projectscout"."usage_reservations"
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING (false)
WITH CHECK (false);
