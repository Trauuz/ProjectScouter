import type { Metadata } from "next";

import { ResearchWorkspace } from "@/features/research";
import { SiteHeader } from "@/shared/layout/site-header";

import "./research.css";

export const metadata: Metadata = {
  title: "Research a project direction | ProjectScout",
  description:
    "Compare three project directions grounded in current public evidence.",
};

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    prompt?: string | string[];
    resume?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const initialPrompt = Array.isArray(query.prompt)
    ? query.prompt[0] || ""
    : query.prompt || "";
  const resumeIntentId = Array.isArray(query.resume)
    ? query.resume[0] || ""
    : query.resume || "";

  return (
    <div className="research-shell">
      <SiteHeader hideNavigationLinks />
      <main className="research-page" id="top">
        <ResearchWorkspace
          initialPrompt={initialPrompt}
          resumeIntentId={resumeIntentId}
        />
      </main>
    </div>
  );
}
