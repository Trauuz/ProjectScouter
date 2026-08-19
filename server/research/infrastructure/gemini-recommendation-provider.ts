import { z } from "zod";

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

type GeminiPart = {
  text?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
};

const UNSUPPORTED_GEMINI_SCHEMA_KEYS = new Set([
  "$schema",
  "minLength",
  "maxLength",
]);

function removeUnsupportedGeminiSchemaKeywords(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(removeUnsupportedGeminiSchemaKeywords);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !UNSUPPORTED_GEMINI_SCHEMA_KEYS.has(key))
      .map(([key, child]) => [
        key,
        removeUnsupportedGeminiSchemaKeywords(child),
      ]),
  );
}

function responseTextFrom(response: GeminiResponse): string {
  return (
    response.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

function parseJsonResponse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (reason) {
    throw new ResearchFailure(
      "UPSTREAM_FAILED",
      "Gemini returned invalid recommendation JSON.",
      reason,
    );
  }
}

function errorMessageFrom(responseBody: string): string {
  try {
    const payload: unknown = JSON.parse(responseBody);
    if (!payload || typeof payload !== "object" || !Object.hasOwn(payload, "error")) {
      return responseBody;
    }

    const error = (payload as { error?: unknown }).error;
    if (!error || typeof error !== "object" || !Object.hasOwn(error, "message")) {
      return responseBody;
    }

    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : responseBody;
  } catch {
    return responseBody;
  }
}

async function upstreamErrorFrom(response: Response): Promise<Error> {
  const responseBody = (await response.text()).replace(/\s+/g, " ").trim();
  const detail = errorMessageFrom(responseBody).slice(0, 1_000);
  const status = `${response.status} ${response.statusText}`.trim();

  return new Error(
    `Gemini responded with ${status}${detail ? `: ${detail}` : ""}`,
  );
}

export class GeminiRecommendationProvider implements RecommendationProvider {
  constructor(
    private readonly apiKey: string,
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
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
        {
          method: "POST",
          signal,
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: RECOMMENDATION_INSTRUCTIONS }],
            },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: JSON.stringify({
                      projectTopic: prompt.toString(),
                      researchSummary: research.summary,
                      evidence: research.sources,
                    }),
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseJsonSchema: removeUnsupportedGeminiSchemaKeywords(
                z.toJSONSchema(schema),
              ),
              maxOutputTokens: 5_000,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new ResearchFailure(
          "UPSTREAM_FAILED",
          "Gemini recommendation generation failed.",
          await upstreamErrorFrom(response),
        );
      }

      const body = (await response.json()) as GeminiResponse;
      const parsed = schema.parse(parseJsonResponse(responseTextFrom(body)));

      return parsed.recommendations.map((recommendation) => ({
        ...recommendation,
        weakEvidence: false,
      }));
    } catch (reason) {
      if (reason instanceof ResearchFailure) {
        throw reason;
      }

      if (signal.aborted) {
        throw new ResearchFailure(
          "UPSTREAM_TIMEOUT",
          "Gemini recommendation generation timed out.",
          reason,
        );
      }

      throw new ResearchFailure(
        "UPSTREAM_FAILED",
        "Gemini recommendation generation failed.",
        reason,
      );
    }
  }
}
