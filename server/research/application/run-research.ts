import type { ResearchPrompt } from "../domain/research-prompt";
import type {
  ProjectRecommendation,
  ResearchBundle,
  ResearchReport,
} from "../domain/research-report";
import { ResearchFailure } from "./research-errors";
import type {
  RecommendationProvider,
  ResearchProvider,
  ResearchUseCase,
} from "./research-ports";

type Dependencies = {
  researchProvider: ResearchProvider;
  recommendationProvider: RecommendationProvider;
  now: () => Date;
};

function withVerifiedEvidence(
  recommendation: ProjectRecommendation,
  research: ResearchBundle,
): ProjectRecommendation {
  const validSourceIds = new Set(research.sources.map((source) => source.id));
  const evidenceSourceIds = [
    ...new Set(
      recommendation.evidenceSourceIds.filter((id) => validSourceIds.has(id)),
    ),
  ];

  return {
    ...recommendation,
    evidenceSourceIds,
    weakEvidence:
      recommendation.evidenceStrength === "weak" || evidenceSourceIds.length < 3,
  };
}

export class RunResearch implements ResearchUseCase {
  private readonly dependencies: Dependencies;

  constructor(
    researchProvider: ResearchProvider,
    recommendationProvider: RecommendationProvider,
    now: () => Date = () => new Date(),
  ) {
    this.dependencies = { researchProvider, recommendationProvider, now };
  }

  async execute(
    prompt: ResearchPrompt,
    signal: AbortSignal,
  ): Promise<ResearchReport> {
    const research = await this.dependencies.researchProvider.research(
      prompt,
      signal,
    );

    if (research.sources.length === 0) {
      throw new ResearchFailure("NO_EVIDENCE", "No usable public sources found.");
    }

    const recommendations =
      await this.dependencies.recommendationProvider.generate(
        prompt,
        research,
        signal,
      );

    if (recommendations.length !== 3) {
      throw new ResearchFailure(
        "UPSTREAM_FAILED",
        "The recommendation provider returned an invalid result count.",
      );
    }

    return {
      prompt: prompt.toString(),
      summary: research.summary,
      generatedAt: this.dependencies.now().toISOString(),
      sources: research.sources,
      recommendations: recommendations.map((recommendation) =>
        withVerifiedEvidence(recommendation, research),
      ),
    };
  }
}
