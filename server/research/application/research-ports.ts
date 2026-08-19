import type { ResearchPrompt } from "../domain/research-prompt";
import type { ResearchOwner } from "../domain/research-owner";
import type {
  ProjectRecommendation,
  ResearchBundle,
  ResearchPersistenceStatus,
  ResearchReport,
} from "../domain/research-report";

export interface ResearchProvider {
  research(prompt: ResearchPrompt, signal: AbortSignal): Promise<ResearchBundle>;
}

export interface RecommendationProvider {
  generate(
    prompt: ResearchPrompt,
    research: ResearchBundle,
    signal: AbortSignal,
  ): Promise<ProjectRecommendation[]>;
}

export interface ResearchUseCase {
  execute(prompt: ResearchPrompt, signal: AbortSignal): Promise<ResearchReport>;
}

export interface ResearchReportWriter {
  saveCompletedResearchRun(
    owner: ResearchOwner,
    report: ResearchReport,
  ): Promise<string>;
}

export interface ResearchWorkflow {
  execute(
    prompt: ResearchPrompt,
    owner: ResearchOwner,
    signal: AbortSignal,
  ): Promise<{
    report: ResearchReport;
    persistence: ResearchPersistenceStatus;
  }>;
}
