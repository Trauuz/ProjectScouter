"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth";
import { createPendingAuthIntentStore } from "@/features/auth/pending-auth-intent-store";

import type {
  ProjectRecommendation,
  ResearchErrorResponse,
  ResearchReport,
  ResearchResponse,
  ResearchSource,
} from "@/server/research/domain/research-report";

import { usePromptHistory } from "../prompt-history/use-prompt-history";
import { PromptHistory } from "./prompt-history";

type ResearchState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      report: ResearchReport;
      persistence: ResearchResponse["persistence"];
    }
  | { status: "error"; message: string; retryable: boolean };

type ResearchWorkspaceProps = {
  initialPrompt: string;
  resumeIntentId?: string;
};

class UnexpectedResearchResponse extends Error {
  readonly category = "unexpected_response";

  constructor(
    readonly status: number,
    readonly contentType: string,
    cause?: unknown,
  ) {
    super("The research API returned an unreadable response.", { cause });
    this.name = "UnexpectedResearchResponse";
  }
}

function isErrorResponse(payload: unknown): payload is ResearchErrorResponse {
  if (!payload || typeof payload !== "object" || !Object.hasOwn(payload, "error")) {
    return false;
  }

  const error = (payload as { error?: unknown }).error;
  return Boolean(error && typeof error === "object" && Object.hasOwn(error, "message"));
}

function isSuccessResponse(payload: unknown): payload is ResearchResponse {
  if (!payload || typeof payload !== "object" || !Object.hasOwn(payload, "report")) {
    return false;
  }

  const report = (payload as { report?: unknown }).report;
  return Boolean(
    report &&
    typeof report === "object" &&
    Object.hasOwn(report, "prompt") &&
    typeof (report as { prompt?: unknown }).prompt === "string" &&
    Object.hasOwn(report, "sources") &&
    Array.isArray((report as { sources?: unknown }).sources) &&
    Object.hasOwn(report, "recommendations") &&
    Array.isArray((report as { recommendations?: unknown }).recommendations),
  );
}

async function parseResearchResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "unknown";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new UnexpectedResearchResponse(response.status, contentType);
  }

  try {
    return await response.json();
  } catch (reason) {
    throw new UnexpectedResearchResponse(response.status, contentType, reason);
  }
}

function reportClientFailure(reason: unknown): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (reason instanceof UnexpectedResearchResponse) {
    console.error("[research-client] Request failed", {
      category: reason.category,
      status: reason.status,
      contentType: reason.contentType,
      cause: reason.cause instanceof Error
        ? `${reason.cause.name}: ${reason.cause.message}`
        : undefined,
    });
    return;
  }

  console.error("[research-client] Request failed", {
    category: reason instanceof TypeError ? "network" : "client",
    error: reason instanceof Error
      ? `${reason.name}: ${reason.message}`
      : String(reason),
  });
}

function clientFailureMessage(reason: unknown): string {
  if (reason instanceof UnexpectedResearchResponse) {
    return "ProjectScout returned an unexpected response. Please try again.";
  }
  if (reason instanceof TypeError) {
    return "ProjectScout could not contact its research API. Check that the app server is running, then try again.";
  }
  return "Research could not start because of an application error. Please try again.";
}

function sourceDate(source: ResearchSource): string {
  if (!source.publishedAt) {
    return "Date unavailable";
  }

  const date = new Date(source.publishedAt);
  if (Number.isNaN(date.valueOf())) {
    return source.publishedAt;
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function EvidenceLinks({
  recommendation,
  sources,
}: {
  recommendation: ProjectRecommendation;
  sources: ResearchSource[];
}) {
  const sourceMap = new Map(sources.map((source) => [source.id, source]));

  return (
    <ul className="recommendation-card__evidence" aria-label="Supporting evidence">
      {recommendation.evidenceSourceIds.map((sourceId) => {
        const source = sourceMap.get(sourceId);
        if (!source) {
          return null;
        }

        return (
          <li key={source.id}>
            <a href={`#${source.id}`}>
              [{source.id.replace("src-", "")}] {source.title}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function RecommendationCard({
  recommendation,
  number,
  sources,
}: {
  recommendation: ProjectRecommendation;
  number: number;
  sources: ResearchSource[];
}) {
  return (
    <article className="recommendation-card">
      <header className="recommendation-card__header">
        <p className="recommendation-card__number" aria-hidden="true">
          {String(number).padStart(2, "0")}
        </p>
        <div>
          <p className="recommendation-card__scope">
            {recommendation.scopeEstimate} scope · {recommendation.evidenceStrength} evidence
          </p>
          <h4>{recommendation.title}</h4>
        </div>
      </header>

      {recommendation.weakEvidence ? (
        <p className="recommendation-card__warning" role="status">
          Limited evidence — validate this direction before committing to a build.
        </p>
      ) : null}

      <dl className="recommendation-card__summary">
        <div>
          <dt>For</dt>
          <dd>{recommendation.targetUser}</dd>
        </div>
        <div>
          <dt>Problem</dt>
          <dd>{recommendation.problem}</dd>
        </div>
        <div>
          <dt>Direction</dt>
          <dd>{recommendation.proposedSolution}</dd>
        </div>
      </dl>

      <EvidenceLinks recommendation={recommendation} sources={sources} />

      <details className="recommendation-card__brief">
        <summary>Open project brief</summary>
        <div className="recommendation-card__brief-grid">
          <section>
            <h5>MVP features</h5>
            <ul>
              {recommendation.mvpFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </section>
          <section>
            <h5>Similar products</h5>
            <ul>
              {recommendation.similarProducts.map((product) => (
                <li key={product}>{product}</li>
              ))}
            </ul>
          </section>
          <section>
            <h5>Differentiation</h5>
            <p>{recommendation.differentiation}</p>
          </section>
          <section>
            <h5>Risks</h5>
            <ul>
              {recommendation.risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          </section>
          <section className="recommendation-card__validation">
            <h5>First validation experiment</h5>
            <p>{recommendation.validationExperiment}</p>
          </section>
        </div>
      </details>
    </article>
  );
}

function pluralize(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function completedDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.valueOf())) {
    return "Completed just now";
  }

  return `Completed ${new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)}`;
}

function ResearchLoading({ prompt }: { prompt: string }) {
  return (
    <div className="research-loading" role="status">
      <header className="research-loading__header">
        <div className="research-loading__status">
          <span aria-hidden="true" />
          <p>Research in progress</p>
        </div>
        <h2>{prompt}</h2>
        <p>
          Searching public products and reviews, then shaping three grounded
          project directions.
        </p>
      </header>
      <div className="research-loading__skeleton" aria-hidden="true">
        {[1, 2, 3].map((number) => (
          <div className="research-loading__row" key={number}>
            <span>{String(number).padStart(2, "0")}</span>
            <div>
              <i />
              <i />
              <i />
            </div>
          </div>
        ))}
      </div>
      <p className="research-loading__note">This can take up to 90 seconds.</p>
    </div>
  );
}

function ResearchIdle() {
  return (
    <div className="research-empty">
      <div className="research-empty__document" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div>
        <h2>Results will collect here.</h2>
        <p>
          Enter a focused project topic. ProjectScout will return three
          directions with supporting public evidence.
        </p>
      </div>
    </div>
  );
}

export function ResearchWorkspace({
  initialPrompt,
  resumeIntentId = "",
}: ResearchWorkspaceProps) {
  const auth = useAuth();
  const router = useRouter();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState(initialPrompt);
  const [state, setState] = useState<ResearchState>({ status: "idle" });
  const {
    prompts: promptHistory,
    rememberPrompt,
    rememberCompletedResearch,
    findCompletedResearch,
  } = usePromptHistory();
  const controllerRef = useRef<AbortController | null>(null);
  const autoStartedRef = useRef(false);
  const resumeStartedRef = useRef<string | null>(null);
  const directGateOpenedRef = useRef(false);

  const runResearch = useCallback(async (nextPrompt: string) => {
    const trimmedPrompt = nextPrompt.trim();
    if (trimmedPrompt.length < 10) {
      setState({
        status: "error",
        message: "Enter a more specific topic using at least 10 characters.",
        retryable: false,
      });
      return;
    }

    if (
      !auth.requireAuth({ kind: "run_research", prompt: trimmedPrompt })
    ) {
      setLastSubmittedPrompt(trimmedPrompt);
      return;
    }

    rememberPrompt(trimmedPrompt);
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLastSubmittedPrompt(trimmedPrompt);
    setState({ status: "loading" });

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmedPrompt }),
        signal: controller.signal,
      });
      const payload = await parseResearchResponse(response);

      if (!response.ok) {
        const error = isErrorResponse(payload) ? payload.error : null;
        if (response.status === 401 || error?.code === "AUTH_REQUIRED") {
          auth.openAuth("login", {
            kind: "run_research",
            prompt: trimmedPrompt,
          });
          setState({ status: "idle" });
          return;
        }
        setState({
          status: "error",
          message: error?.message || "Research could not be completed.",
          retryable: error?.retryable ?? true,
        });
        return;
      }

      if (!isSuccessResponse(payload)) {
        throw new UnexpectedResearchResponse(
          response.status,
          response.headers.get("content-type") ?? "unknown",
        );
      }

      const completedResearch: ResearchResponse = {
        report: payload.report,
        persistence: payload.persistence ?? {
          status: "failed",
        },
      };
      rememberCompletedResearch(completedResearch);
      setState({
        status: "success",
        report: completedResearch.report,
        persistence: completedResearch.persistence,
      });
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") {
        return;
      }

      reportClientFailure(reason);
      setState({
        status: "error",
        message: clientFailureMessage(reason),
        retryable: true,
      });
    }
  }, [auth, rememberCompletedResearch, rememberPrompt]);

  useEffect(() => {
    if (!auth.ready || auth.user || directGateOpenedRef.current) {
      return;
    }
    if (initialPrompt || resumeIntentId) {
      if (resumeIntentId) {
        directGateOpenedRef.current = true;
        auth.openAuth("login");
      }
      return;
    }

    directGateOpenedRef.current = true;
    auth.openAuth("login", { kind: "open_research" });
  }, [auth, initialPrompt, resumeIntentId]);

  useEffect(() => {
    if (
      !resumeIntentId ||
      !auth.user ||
      resumeStartedRef.current === resumeIntentId
    ) {
      return;
    }

    resumeStartedRef.current = resumeIntentId;
    const intent = createPendingAuthIntentStore().consume(resumeIntentId);
    router.replace("/research");
    if (intent?.kind === "run_research") {
      const timer = window.setTimeout(() => {
        setPrompt(intent.prompt);
        void runResearch(intent.prompt);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [auth.user, resumeIntentId, router, runResearch]);

  useEffect(() => {
    if (!initialPrompt || autoStartedRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      autoStartedRef.current = true;
      void runResearch(initialPrompt);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialPrompt, runResearch]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runResearch(prompt);
  }

  function restoreSavedSession(savedPrompt: string) {
    controllerRef.current?.abort();
    setPrompt(savedPrompt);
    setLastSubmittedPrompt(savedPrompt);
    const completedResearch = findCompletedResearch(savedPrompt);
    if (!completedResearch) {
      setState({ status: "idle" });
      return;
    }
    setState({
      status: "success",
      report: completedResearch.report,
      persistence: completedResearch.persistence,
    });
  }

  const submittedPrompt = lastSubmittedPrompt || prompt.trim();

  return (
    <div
      className="research-workspace"
      data-auth-locked={!auth.user || undefined}
      inert={!auth.user ? true : undefined}
    >
      <div className="research-workspace__body">
        <aside className="research-request" aria-label="Research request">
          <div className="research-request__heading">
            <h2>Your request</h2>
            <p>Shape the question that guides the research.</p>
          </div>

          {submittedPrompt ? (
            <div className="research-request__submitted">
              <span>Current topic</span>
              <p>{submittedPrompt}</p>
            </div>
          ) : null}

          <form className="research-form" onSubmit={handleSubmit}>
            <label htmlFor="research-prompt">Research prompt</label>
            <textarea
              id="research-prompt"
              name="prompt"
              value={prompt}
              minLength={10}
              maxLength={500}
              rows={5}
              required
              disabled={!auth.user || state.status === "loading"}
              aria-describedby="research-prompt-hint"
              aria-invalid={state.status === "error" && !state.retryable}
              onChange={(event) => setPrompt(event.currentTarget.value)}
            />
            <p className="research-form__hint" id="research-prompt-hint">
              Public sources only · 10–500 characters
            </p>
            <button
              className="button research-form__submit"
              type="submit"
              disabled={!auth.user || state.status === "loading"}
            >
              {state.status === "loading"
                ? "Researching…"
                : state.status === "success"
                  ? "Run new research"
                  : "Run research"}
            </button>
          </form>

          {promptHistory.length > 0 ? (
            <PromptHistory
              prompts={promptHistory}
              onSelect={restoreSavedSession}
            />
          ) : (
            <div className="research-request__method">
              <h3>What this run includes</h3>
              <ol>
                <li>
                  <span>1</span>
                  <p>Search current products and user feedback</p>
                </li>
                <li>
                  <span>2</span>
                  <p>Compare problems, gaps, and existing approaches</p>
                </li>
                <li>
                  <span>3</span>
                  <p>Prepare three evidence-backed project briefs</p>
                </li>
              </ol>
            </div>
          )}
        </aside>

        <section className="research-results" aria-label="Research results">
          <div className="research-status" aria-live="polite">
            {state.status === "error" ? (
              <div className="research-status__error" role="alert">
                <div>
                  <span>Research stopped</span>
                  <p>{state.message}</p>
                </div>
                {state.retryable ? (
                  <button
                    className="button"
                    type="button"
                    onClick={() => void runResearch(lastSubmittedPrompt)}
                  >
                    Try again
                  </button>
                ) : null}
              </div>
            ) : null}
            {state.status === "success" &&
            state.persistence.status === "failed" ? (
              <div className="research-status__notice" role="status">
                <span>Research complete</span>
                <p>
                  This report is ready, but it could not be saved. Keep this
                  page open if you need to refer back to it.
                </p>
              </div>
            ) : null}
          </div>

          {state.status === "idle" ? <ResearchIdle /> : null}
          {state.status === "loading" ? (
            <ResearchLoading prompt={submittedPrompt} />
          ) : null}

          {state.status === "success" ? (
            <div className="research-report">
              <header className="research-report__header">
                <div className="research-report__status">
                  <span aria-hidden="true" />
                  <p>Research complete</p>
                  <time dateTime={state.report.generatedAt}>
                    {completedDate(state.report.generatedAt)}
                  </time>
                </div>
                <h2>{state.report.prompt}</h2>
                <div className="research-report__metrics" aria-label="Report summary">
                  <span>{pluralize(state.report.recommendations.length, "direction")}</span>
                  <span>{pluralize(state.report.sources.length, "source")}</span>
                </div>
              </header>

              <section
                className="recommendation-list"
                aria-labelledby="directions-title"
              >
                <div className="recommendation-list__heading">
                  <h3 id="directions-title">Project directions</h3>
                  <p>Compare the strongest paths before choosing what to validate.</p>
                </div>
                {state.report.recommendations.map((recommendation, index) => (
                  <RecommendationCard
                    key={recommendation.title}
                    recommendation={recommendation}
                    number={index + 1}
                    sources={state.report.sources}
                  />
                ))}
              </section>

              <section className="source-index" aria-labelledby="source-index-title">
                <div className="source-index__header">
                  <div>
                    <h3 id="source-index-title">Evidence index</h3>
                    <p>
                      Public evidence stays separate from ProjectScout’s
                      interpretation.
                    </p>
                  </div>
                  <span>{pluralize(state.report.sources.length, "source")}</span>
                </div>
                <ol>
                  {state.report.sources.map((source) => (
                    <li id={source.id} key={source.id}>
                      <div>
                        <span aria-hidden="true">
                          {source.id.replace("src-", "").padStart(2, "0")}
                        </span>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {source.title}
                        </a>
                      </div>
                      <p>{source.snippet || "No excerpt was returned."}</p>
                      <time>{sourceDate(source)}</time>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
