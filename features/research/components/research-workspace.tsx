"use client";

import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ReactLenis } from "lenis/react";

gsap.registerPlugin(useGSAP);

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
import type { PromptHistoryEntry } from "../prompt-history/prompt-history-store";
import { DeleteResearchDialog } from "./delete-research-dialog";
import { PromptHistory, type PromptHistoryHandle } from "./prompt-history";

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

const TACTILE_TARGET_SELECTOR =
  '[data-tactile="true"], .research-history__list button';

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

function tactileTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const element = target.closest<HTMLElement>(TACTILE_TARGET_SELECTOR);
  if (
    !element ||
    element.matches(":disabled") ||
    element.getAttribute("aria-disabled") === "true"
  ) {
    return null;
  }

  return element;
}

function reducedMotionRequested(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
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
            <a href={`#${source.id}`} className="evidence-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              <span>[{source.id.replace("src-", "")}] {source.title}</span>
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
    <article
      className="recommendation-card"
      data-tactile="true"
    >
      <header className="recommendation-card__header">
        <div className="recommendation-card__header-top">
          <p className="recommendation-card__number" aria-hidden="true">
            {String(number).padStart(2, "0")}
          </p>
          <p className="recommendation-card__scope">
            {recommendation.scopeEstimate} scope · {recommendation.evidenceStrength} evidence
          </p>
        </div>
        <h4>{recommendation.title}</h4>
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
  const loadingRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reducedMotionRequested()) {
        return;
      }

      const cards = gsap.utils.toArray<HTMLElement>(
        ".research-loading__card",
      );

      gsap.from(cards, {
        autoAlpha: 0,
        y: 18,
        duration: 0.55,
        stagger: 0.1,
        ease: "power3.out",
      });
      gsap.to(cards, {
        y: -6,
        duration: 0.9,
        stagger: 0.16,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.fromTo(
        ".research-loading__scan-beam",
        { xPercent: -110 },
        {
          xPercent: 390,
          duration: 1.45,
          repeat: -1,
          repeatDelay: 0.15,
          ease: "power2.inOut",
        },
      );
      gsap.to(".research-loading__status > span", {
        scale: 1.55,
        duration: 0.65,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    },
    { scope: loadingRef },
  );

  return (
    <div className="research-loading" role="status" ref={loadingRef}>
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
      <div className="research-loading__scan" aria-hidden="true">
        <div className="research-loading__scan-track">
          <span className="research-loading__scan-beam" />
        </div>
        <div className="research-loading__scan-labels">
          <span>Scanning sources</span>
          <span>Comparing evidence</span>
          <span>Building directions</span>
        </div>
      </div>
      <div className="research-loading__skeleton" aria-hidden="true">
        {[1, 2, 3].map((number) => (
          <div className="research-loading__card" key={number}>
            <div className="research-loading__card-header">
              <span>{String(number).padStart(2, "0")}</span>
              <div>
                <i />
                <i />
              </div>
            </div>
            <div className="research-loading__summary">
              {[1, 2, 3].map((section) => (
                <div key={section}>
                  <i />
                  <i />
                  <i />
                </div>
              ))}
            </div>
            <div className="research-loading__chips">
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
      <div className="research-empty__card">
        <div className="research-empty__document" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="research-empty__copy">
          <h2>Results will collect here.</h2>
          <p>
            Enter a focused project topic. ProjectScout will return three
            directions with supporting public evidence.
          </p>
        </div>
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
  const [activeResearchId, setActiveResearchId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromptHistoryEntry | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const {
    entries: promptHistory,
    rememberPrompt,
    rememberCompletedResearch,
    deleteResearch,
    findCompletedResearch,
  } = usePromptHistory();
  const controllerRef = useRef<AbortController | null>(null);
  const promptHistoryRef = useRef<PromptHistoryHandle>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const autoStartedRef = useRef(false);
  const resumeStartedRef = useRef<string | null>(null);
  const directGateOpenedRef = useRef(false);
  const { contextSafe } = useGSAP({ scope: workspaceRef });

  const handleTactilePointerDown = contextSafe(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const target = tactileTarget(event.target);
      if (!target || reducedMotionRequested()) {
        return;
      }

      gsap.killTweensOf(target);
      gsap.to(target, {
        scale: 0.98,
        duration: 0.15,
        ease: "power2.out",
      });
    },
  );

  const handleTactilePointerRelease = contextSafe(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const target = tactileTarget(event.target);
      if (!target || reducedMotionRequested()) {
        return;
      }

      gsap.killTweensOf(target);
      gsap.to(target, {
        scale: 1,
        duration: 0.5,
        ease: "elastic.out(1, 0.5)",
        clearProps: "transform",
      });
    },
  );

  const handleTactilePointerOut = contextSafe(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const target = tactileTarget(event.target);
      if (!target) {
        return;
      }

      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && target.contains(nextTarget)) {
        return;
      }

      if (reducedMotionRequested()) {
        return;
      }

      gsap.killTweensOf(target);
      gsap.to(target, {
        scale: 1,
        duration: 0.5,
        ease: "elastic.out(1, 0.5)",
        clearProps: "transform",
      });
    },
  );

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

    setActiveResearchId(rememberPrompt(trimmedPrompt));
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
      setActiveResearchId(rememberCompletedResearch(completedResearch));
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

  function handlePromptKeyDown(
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  function restoreSavedSession(id: string) {
    const savedSession = promptHistory.find((entry) => entry.id === id);
    if (!savedSession) {
      return;
    }

    controllerRef.current?.abort();
    setPrompt(savedSession.prompt);
    setLastSubmittedPrompt(savedSession.prompt);
    setActiveResearchId(savedSession.id);
    const completedResearch = findCompletedResearch(savedSession.id);
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

  function requestResearchDeletion(id: string) {
    if (deleting) {
      return;
    }
    const entry = promptHistory.find((candidate) => candidate.id === id);
    if (!entry) {
      return;
    }
    setDeleteError("");
    setDeleteTarget(entry);
  }

  function cancelResearchDeletion() {
    if (deleting) {
      return;
    }
    setDeleteError("");
    setDeleteTarget(null);
  }

  async function confirmResearchDeletion() {
    if (!deleteTarget || deleting) {
      return;
    }

    const deletedId = deleteTarget.id;
    setDeleting(true);
    setDeleteError("");
    try {
      await promptHistoryRef.current?.animateDeletion(deletedId);
      await deleteResearch(deletedId);
      if (deletedId === activeResearchId) {
        controllerRef.current?.abort();
        setPrompt("");
        setLastSubmittedPrompt("");
        setActiveResearchId(null);
        setState({ status: "idle" });
      }
      setDeleteTarget(null);
    } catch {
      promptHistoryRef.current?.restoreDeletion(deletedId);
      setDeleteError("Research could not be deleted. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const submittedPrompt = lastSubmittedPrompt || prompt.trim();
  const activeEntry = promptHistory.find(
    (entry) => entry.id === activeResearchId,
  ) ?? null;

  return (
    <div
      className="research-workspace"
      ref={workspaceRef}
      data-auth-locked={!auth.user || undefined}
      inert={!auth.user ? true : undefined}
      onPointerDownCapture={handleTactilePointerDown}
      onPointerUpCapture={handleTactilePointerRelease}
      onPointerCancelCapture={handleTactilePointerRelease}
      onPointerOutCapture={handleTactilePointerOut}
    >
      <div className="research-workspace__body">
        <aside className="research-request" aria-label="Research request">
          <div className="research-request__heading">
            <h2>Your request</h2>
            <p>Shape the question that guides the research.</p>
          </div>

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
              onKeyDownCapture={handlePromptKeyDown}
            />
            <p className="research-form__hint" id="research-prompt-hint">
              Public sources only · 10–500 characters · Enter to run ·
              Shift+Enter for a new line
            </p>
            <button
              className="button research-form__submit"
              data-tactile="true"
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
              ref={promptHistoryRef}
              entries={promptHistory}
              activeId={activeResearchId}
              deletingId={deleting ? deleteTarget?.id ?? null : null}
              onDelete={requestResearchDeletion}
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

        <ReactLenis
          className="research-results"
          role="region"
          aria-label="Research results"
          data-lenis-prevent
          data-lenis-smooth
          options={{
            lerp: 0.1,
            smoothWheel: true,
            overscroll: false,
          }}
        >
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
                    data-tactile="true"
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
                <div className="research-report__title-row">
                  <h2>{state.report.prompt}</h2>
                  {activeEntry ? (
                    <button
                      className="research-report__remove"
                      data-tactile="true"
                      type="button"
                      aria-label="Remove research from history"
                      onClick={() => requestResearchDeletion(activeEntry.id)}
                    >
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="m19 6-1 14H6L5 6" />
                        <path d="M10 11v5M14 11v5" />
                      </svg>
                      <span>Remove</span>
                    </button>
                  ) : null}
                </div>
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
        </ReactLenis>
      </div>
      <DeleteResearchDialog
        entry={deleteTarget}
        error={deleteError}
        deleting={deleting}
        onCancel={cancelResearchDeletion}
        onConfirm={confirmResearchDeletion}
      />
    </div>
  );
}
