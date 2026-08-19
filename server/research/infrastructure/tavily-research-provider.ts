import { normalizeResearchSources } from "../application/normalize-sources";
import { ResearchFailure } from "../application/research-errors";
import type { ResearchProvider } from "../application/research-ports";
import type { ResearchPrompt } from "../domain/research-prompt";
import type {
  RawResearchSource,
  ResearchBundle,
} from "../domain/research-report";

type TavilySearchResult = {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  raw_content?: unknown;
  published_date?: unknown;
  publishedAt?: unknown;
};

type TavilySearchResponse = {
  answer?: unknown;
  results?: unknown;
};

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

function tavilyErrorMessage(responseBody: string): string {
  try {
    const payload: unknown = JSON.parse(responseBody);
    if (!payload || typeof payload !== "object") {
      return responseBody;
    }

    for (const field of ["detail", "message", "error"] as const) {
      if (Object.hasOwn(payload, field)) {
        const value = (payload as Record<string, unknown>)[field];
        if (typeof value === "string") {
          return value;
        }
      }
    }
    return responseBody;
  } catch {
    return responseBody;
  }
}

async function tavilyUpstreamError(response: Response): Promise<Error> {
  const responseBody = (await response.text()).replace(/\s+/g, " ").trim();
  const detail = tavilyErrorMessage(responseBody).slice(0, 1_000);
  const status = `${response.status} ${response.statusText}`.trim();
  return new Error(
    `Tavily responded with ${status}${detail ? `: ${detail}` : ""}`,
  );
}

function rawSourcesFrom(results: unknown): RawResearchSource[] {
  if (!Array.isArray(results)) {
    return [];
  }

  return results.flatMap((result: TavilySearchResult) => {
    if (
      typeof result.title !== "string" ||
      typeof result.url !== "string"
    ) {
      return [];
    }

    const snippet =
      typeof result.content === "string"
        ? result.content
        : typeof result.raw_content === "string"
          ? result.raw_content
          : "";

    return [
      {
        title: result.title,
        url: result.url,
        snippet,
        publishedAt:
          typeof result.published_date === "string"
            ? result.published_date
            : typeof result.publishedAt === "string"
              ? result.publishedAt
              : null,
      },
    ];
  });
}

function summaryFrom(
  response: TavilySearchResponse,
  sourceCount: number,
): string {
  if (typeof response.answer === "string" && response.answer.trim()) {
    return response.answer.trim();
  }

  const noun = sourceCount === 1 ? "source" : "sources";
  return `Tavily found ${sourceCount} relevant public ${noun} for this topic.`;
}

export function extractTavilyResearch(
  response: TavilySearchResponse,
): ResearchBundle {
  const sources = normalizeResearchSources(rawSourcesFrom(response.results));

  return {
    summary: summaryFrom(response, sources.length),
    sources,
  };
}

export class TavilyResearchProvider implements ResearchProvider {
  constructor(private readonly apiKey: string) {}

  async research(
    prompt: ResearchPrompt,
    signal: AbortSignal,
  ): Promise<ResearchBundle> {
    try {
      const response = await fetch(TAVILY_SEARCH_URL, {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query: [
            "existing apps websites product reviews user complaints gaps",
            prompt.toString(),
          ].join(" "),
          search_depth: "advanced",
          max_results: 10,
          include_answer: "basic",
          include_raw_content: false,
          include_images: false,
          topic: "general",
          country: "united states",
        }),
      });

      if (!response.ok) {
        throw new ResearchFailure(
          "UPSTREAM_FAILED",
          "Tavily search failed.",
          await tavilyUpstreamError(response),
        );
      }

      return extractTavilyResearch(
        (await response.json()) as TavilySearchResponse,
      );
    } catch (reason) {
      if (reason instanceof ResearchFailure) {
        throw reason;
      }

      if (signal.aborted) {
        throw new ResearchFailure(
          "UPSTREAM_TIMEOUT",
          "Tavily research timed out.",
          reason,
        );
      }

      throw new ResearchFailure(
        "UPSTREAM_FAILED",
        "Tavily research failed.",
        reason,
      );
    }
  }
}
