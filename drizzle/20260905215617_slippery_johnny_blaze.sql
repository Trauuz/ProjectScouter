CREATE TABLE "projectscout"."account_monthly_usage" (
	"user_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"used_credits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_monthly_usage_user_id_period_start_pk" PRIMARY KEY("user_id","period_start")
);
--> statement-breakpoint
ALTER TABLE "projectscout"."account_monthly_usage" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "projectscout"."account_monthly_usage" FROM PUBLIC;
