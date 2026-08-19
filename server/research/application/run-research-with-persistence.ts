import type { ResearchPrompt } from "../domain/research-prompt";
import type { ResearchOwner } from "../domain/research-owner";
import type {
  ResearchReportWriter,
  ResearchUseCase,
  ResearchWorkflow,
} from "./research-ports";

type RepositoryProvider = () => ResearchReportWriter;
type FailureReporter = (reason: unknown) => void;

export class RunResearchWithPersistence implements ResearchWorkflow {
  constructor(
    private readonly runResearch: ResearchUseCase,
    private readonly repositoryProvider: RepositoryProvider,
    private readonly reportPersistenceFailure: FailureReporter = (reason) =>
      console.error("[research-persistence] Save failed", reason),
  ) {}

  async execute(
    prompt: ResearchPrompt,
    owner: ResearchOwner,
    signal: AbortSignal,
  ) {
    const report = await this.runResearch.execute(prompt, signal);

    try {
      const repository = this.repositoryProvider();
      const runId = await repository.saveCompletedResearchRun(owner, report);
      return { report, persistence: { status: "saved" as const, runId } };
    } catch (reason) {
      this.reportPersistenceFailure(reason);
      return { report, persistence: { status: "failed" as const } };
    }
  }
}
