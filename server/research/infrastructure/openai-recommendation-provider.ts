import OpenAI, {
  APIConnectionTimeoutError,
  APIUserAbortError,
} from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import {
  createRecommendationSchema,
  RECOMMENDATION_INSTRUCTIONS,
} from "../application/recommendation-contract";
import { ResearchFailure } from "../application/research-errors";
import type { RecommendationProvider } from "../application/research-ports";
import type { ResearchPrompt } from "../domain/research-prompt";
import type {
  ProjectRecommendation,
  ResearchBundle,
} from "../domain/research-report";

export class OpenAiRecommendationProvider implements RecommendationProvider {
  constructor(
    private readonly client: OpenAI,
    private readonly model: string,
  ) {}

  async generate(
    prompt: ResearchPrompt,
    research: ResearchBundle,
    signal: AbortSignal,
  ): Promise<ProjectRecommendation[]> {
    const schema = createRecommendationSchema(
      research.sources.map((source) => source.id),
    );

    try {
      const response = await this.client.responses.parse(
        {
          model: this.model,
          instructions: RECOMMENDATION_INSTRUCTIONS,
          input: [
            {
              role: "user",
              content: JSON.stringify({
                projectTopic: prompt.toString(),
                researchSummary: research.summary,
                evidence: research.sources,
              }),
            },
          ],
          reasoning: { effort: "low" },
          max_output_tokens: 5_000,
          store: false,
          text: {
            format: zodTextFormat(schema, "project_recommendations"),
          },
        },
        { signal, timeout: 25_000, maxRetries: 0 },
      );

      if (!response.output_parsed) {
        throw new ResearchFailure(
          "UPSTREAM_FAILED",
          "OpenAI returned no structured recommendations.",
        );
      }

      return response.output_parsed.recommendations.map((recommendation) => ({
        ...recommendation,
        weakEvidence: false,
      }));
    } catch (reason) {
      if (reason instanceof ResearchFailure) {
        throw reason;
      }

      if (
        signal.aborted ||
        reason instanceof APIConnectionTimeoutError ||
        reason instanceof APIUserAbortError
      ) {
        throw new ResearchFailure(
          "UPSTREAM_TIMEOUT",
          "OpenAI recommendation generation timed out.",
          reason,
        );
      }

      throw new ResearchFailure(
        "UPSTREAM_FAILED",
        "OpenAI recommendation generation failed.",
        reason,
      );
    }
  }
}
