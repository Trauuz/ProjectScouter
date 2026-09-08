import type { Metadata } from "next";

import { ResearchShell } from "@/features/research";

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
    <ResearchShell
      initialPrompt={initialPrompt}
      resumeIntentId={resumeIntentId}
    />
  );
}
