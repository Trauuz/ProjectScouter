CREATE SCHEMA "projectscout";
--> statement-breakpoint
CREATE TYPE "projectscout"."evidence_strength" AS ENUM('strong', 'medium', 'weak');--> statement-breakpoint
CREATE TYPE "projectscout"."scope_estimate" AS ENUM('small', 'medium', 'large');--> statement-breakpoint
CREATE TABLE "projectscout"."project_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"research_run_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"target_user" text NOT NULL,
	"problem" text NOT NULL,
	"proposed_solution" text NOT NULL,
	"mvp_features" jsonb NOT NULL,
	"scope_estimate" "projectscout"."scope_estimate" NOT NULL,
	"similar_products" jsonb NOT NULL,
	"differentiation" text NOT NULL,
	"risks" jsonb NOT NULL,
	"validation_experiment" text NOT NULL,
	"evidence_strength" "projectscout"."evidence_strength" NOT NULL,
	"weak_evidence" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projectscout"."recommendation_sources" (
	"recommendation_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	CONSTRAINT "recommendation_sources_recommendation_id_source_id_pk" PRIMARY KEY("recommendation_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "projectscout"."research_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid,
	"prompt" text NOT NULL,
	"summary" text NOT NULL,
	"generated_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projectscout"."research_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"research_run_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"snippet" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projectscout"."project_recommendations" ADD CONSTRAINT "project_recommendations_research_run_id_research_runs_id_fk" FOREIGN KEY ("research_run_id") REFERENCES "projectscout"."research_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projectscout"."recommendation_sources" ADD CONSTRAINT "recommendation_sources_recommendation_id_project_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "projectscout"."project_recommendations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projectscout"."recommendation_sources" ADD CONSTRAINT "recommendation_sources_source_id_research_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "projectscout"."research_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projectscout"."research_sources" ADD CONSTRAINT "research_sources_research_run_id_research_runs_id_fk" FOREIGN KEY ("research_run_id") REFERENCES "projectscout"."research_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_recommendations_run_position_uidx" ON "projectscout"."project_recommendations" USING btree ("research_run_id","position");--> statement-breakpoint
CREATE INDEX "project_recommendations_run_idx" ON "projectscout"."project_recommendations" USING btree ("research_run_id");--> statement-breakpoint
CREATE INDEX "recommendation_sources_source_idx" ON "projectscout"."recommendation_sources" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "research_runs_session_created_idx" ON "projectscout"."research_runs" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "research_runs_user_created_idx" ON "projectscout"."research_runs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "research_sources_run_source_key_uidx" ON "projectscout"."research_sources" USING btree ("research_run_id","source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "research_sources_run_position_uidx" ON "projectscout"."research_sources" USING btree ("research_run_id","position");--> statement-breakpoint
CREATE INDEX "research_sources_run_idx" ON "projectscout"."research_sources" USING btree ("research_run_id");--> statement-breakpoint
ALTER TABLE "projectscout"."research_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projectscout"."research_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projectscout"."project_recommendations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projectscout"."recommendation_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON SCHEMA "projectscout" FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA "projectscout" FROM PUBLIC;
