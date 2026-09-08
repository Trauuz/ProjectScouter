CREATE POLICY "server_only_deny_all"
ON "projectscout"."research_runs"
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING (false)
WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "server_only_deny_all"
ON "projectscout"."research_sources"
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING (false)
WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "server_only_deny_all"
ON "projectscout"."project_recommendations"
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING (false)
WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "server_only_deny_all"
ON "projectscout"."recommendation_sources"
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING (false)
WITH CHECK (false);
--> statement-breakpoint
CREATE POLICY "server_only_deny_all"
ON "projectscout"."account_monthly_usage"
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING (false)
WITH CHECK (false);
