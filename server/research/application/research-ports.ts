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
    runId?: string,
  ): Promise<string>;
}

export type StagedResearch = Readonly<{
  id: string;
  report: ResearchReport;
}>;

export interface ResearchPersistenceJobStore {
  stageGenerated(
    owner: ResearchOwner,
    report: ResearchReport,
    usageReservationId?: string,
  ): Promise<StagedResearch>;
  materialize(
    retryId: string,
    owner: ResearchOwner,
  ): Promise<{ report: ResearchReport; runId: string }>;
}

export type ResearchExecutionContext = Readonly<{
  usageReservationId?: string;
}>;

export interface ResearchWorkflow {
  execute(
    prompt: ResearchPrompt,
    owner: ResearchOwner,
    signal: AbortSignal,
    context?: ResearchExecutionContext,
  ): Promise<{
    report: ResearchReport;
    persistence: ResearchPersistenceStatus;
  }>;
  retry?(
    retryId: string,
    owner: ResearchOwner,
  ): Promise<{
    report: ResearchReport;
    persistence: ResearchPersistenceStatus;
  }>;
}
