// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext, type AuthContextValue } from "@/features/auth/auth-context";
import { LocalPromptHistoryStore } from "../prompt-history/prompt-history-store";
import { ResearchWorkspace } from "./research-workspace";

const gsapMocks = vi.hoisted(() => ({
  autoCompleteTimeline: true,
  killTweensOf: vi.fn(),
  registerPlugin: vi.fn(),
  set: vi.fn(),
  timelineCompletions: [] as Array<() => void>,
  timelineKill: vi.fn(),
  timelineTo: vi.fn(),
  timeline: vi.fn((options?: { onComplete?(): void }) => {
    const complete = () => options?.onComplete?.();
    const instance = {
      kill: gsapMocks.timelineKill,
      to: (...args: unknown[]) => {
        gsapMocks.timelineTo(...args);
        return instance;
      },
    };
    gsapMocks.timelineCompletions.push(complete);
    if (gsapMocks.autoCompleteTimeline) {
      queueMicrotask(complete);
    }
    return instance;
  }),
  to: vi.fn(),
}));

vi.mock("gsap", () => ({
  default: gsapMocks,
}));

vi.mock("@gsap/react", () => ({
  useGSAP: () => ({
    contextSafe: (callback: (...args: never[]) => unknown) => callback,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

function authContext(
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue {
  return {
    user: {
      id: "f965595b-47ae-4d97-8b3a-9033379d184f",
      email: "student@example.com",
      initials: "S",
    },
    ready: true,
    isOpen: false,
    mode: "login",
    noticeEmail: "",
    noticeMessage: "",
    openAuth: vi.fn(),
    closeAuth: vi.fn(),
    requireAuth: vi.fn(() => true),
    signIn: vi.fn(async () => ({ ok: true as const })),
    signUp: vi.fn(async () => ({ ok: true as const })),
    sendPasswordReset: vi.fn(async () => ({ ok: true as const })),
    updatePassword: vi.fn(async () => ({ ok: true as const })),
    signOut: vi.fn(async () => undefined),
    ...overrides,
  };
}

function renderWorkspace(
  props: { initialPrompt: string; resumeIntentId?: string },
  auth: AuthContextValue = authContext(),
) {
  return render(
    <AuthContext.Provider value={auth}>
      <ResearchWorkspace {...props} />
    </AuthContext.Provider>,
  );
}

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

const report = {
  prompt: "Budgeting tools for first-year college students",
  summary: "Students need semester-aware planning.",
  generatedAt: "2026-08-11T00:00:00.000Z",
  sources: [
    {
      id: "src-1",
      title: "Student finance survey",
      url: "https://example.com/survey",
      snippet: "Students report irregular semester expenses.",
      publishedAt: "2026-05-01",
    },
  ],
  recommendations: [1, 2, 3].map((number) => ({
    title: `Semester Budget Map ${number}`,
    targetUser: "First-year college students",
    problem: "Monthly budgets miss irregular semester expenses.",
    proposedSolution: "Plan money around the academic calendar.",
    mvpFeatures: ["Expense calendar", "Budget checkpoints", "Alerts"],
    scopeEstimate: "small" as const,
    similarProducts: ["YNAB"],
    differentiation: "Academic-term planning instead of monthly planning.",
    risks: ["Students may not know future costs."],
    validationExperiment: "Interview five first-year students.",
    evidenceSourceIds: ["src-1"],
    evidenceStrength: "weak" as const,
    weakEvidence: true,
  })),
};

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
});

afterEach(() => {
  window.localStorage.clear();
  gsapMocks.killTweensOf.mockClear();
  gsapMocks.set.mockClear();
  gsapMocks.timeline.mockClear();
  gsapMocks.timelineCompletions.length = 0;
  gsapMocks.timelineKill.mockClear();
  gsapMocks.timelineTo.mockClear();
  gsapMocks.autoCompleteTimeline = true;
  gsapMocks.to.mockClear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ResearchWorkspace", () => {
  it("does not render the redundant workspace status header", () => {
    vi.stubGlobal("fetch", vi.fn());

    renderWorkspace({ initialPrompt: "" });

    expect(screen.queryByText("Project research")).not.toBeInTheDocument();
    expect(screen.queryByText("Ready for a prompt")).not.toBeInTheDocument();
  });

  it("renders the idle state inside an elevated state card", () => {
    vi.stubGlobal("fetch", vi.fn());

    const { container } = renderWorkspace({ initialPrompt: "" });

    expect(container.querySelector(".research-empty__card")).toBeInTheDocument();
  });

  it("renders three recommendation-shaped loading cards", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)));

    const { container } = renderWorkspace({ initialPrompt: report.prompt });

    expect(await screen.findByText("Research in progress")).toBeInTheDocument();
    expect(container.querySelectorAll(".research-loading__card")).toHaveLength(3);
  });

  it("submits the research prompt when Enter is pressed", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ report, persistence: { status: "saved" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });
    const prompt = screen.getByLabelText("Research prompt");
    await user.type(prompt, report.prompt);
    await user.keyboard("{Enter}");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(prompt).toHaveValue(report.prompt);
  });

  it("submits Enter even when the browser retains its composition flag", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ report, persistence: { status: "saved" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });
    const prompt = screen.getByLabelText("Research prompt");
    await user.type(prompt, report.prompt);
    fireEvent.keyDown(prompt, {
      key: "Enter",
      code: "Enter",
      isComposing: true,
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(prompt).toHaveValue(report.prompt);
  });

  it("keeps Shift+Enter available for a prompt line break", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });
    const prompt = screen.getByLabelText("Research prompt");
    await user.type(prompt, "Compare finance apps");
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(prompt).toHaveValue("Compare finance apps\n");
  });

  it("applies tactile feedback to submit and history controls", async () => {
    stubReducedMotion(false);
    const historyStore = new LocalPromptHistoryStore(window.localStorage);
    historyStore.save("A prior research prompt for design studios");
    vi.stubGlobal("fetch", vi.fn());

    renderWorkspace({ initialPrompt: "" });

    const submit = screen.getByRole("button", { name: "Run research" });
    const history = await screen.findByRole("region", {
      name: "Previous prompts",
    });
    const historyButton = within(history).getByRole("button", {
      name: "A prior research prompt for design studios",
    });

    fireEvent.pointerDown(submit);
    expect(gsapMocks.killTweensOf).toHaveBeenCalledWith(submit);
    expect(gsapMocks.to).toHaveBeenCalledWith(
      submit,
      expect.objectContaining({ duration: 0.15, scale: 0.98 }),
    );

    fireEvent.pointerUp(submit);
    expect(gsapMocks.to).toHaveBeenCalledWith(
      submit,
      expect.objectContaining({ clearProps: "transform", scale: 1 }),
    );

    fireEvent.pointerDown(historyButton);
    expect(gsapMocks.to).toHaveBeenCalledWith(
      historyButton,
      expect.objectContaining({ scale: 0.98 }),
    );
  });

  it("skips tactile feedback for disabled controls and reduced motion", () => {
    stubReducedMotion(true);
    vi.stubGlobal("fetch", vi.fn());

    renderWorkspace(
      { initialPrompt: "" },
      authContext({ user: null, requireAuth: vi.fn(() => false) }),
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Run research" }));
    expect(gsapMocks.to).not.toHaveBeenCalled();
  });

  it("applies tactile feedback to retry without changing retry behavior", async () => {
    stubReducedMotion(false);
    const fetchMock = vi.fn(async () =>
      Response.json(
        {
          error: {
            code: "PROVIDER_UNAVAILABLE",
            message: "The research provider is temporarily unavailable.",
            retryable: true,
          },
        },
        { status: 503 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });
    await user.type(screen.getByLabelText("Research prompt"), report.prompt);
    await user.click(screen.getByRole("button", { name: "Run research" }));

    const retry = await screen.findByRole("button", { name: "Try again" });
    gsapMocks.to.mockClear();
    fireEvent.pointerDown(retry);
    fireEvent.pointerUp(retry);
    expect(gsapMocks.to).toHaveBeenCalledWith(
      retry,
      expect.objectContaining({ scale: 0.98 }),
    );

    await user.click(retry);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("runs the query once and shows three evidence-backed directions", async () => {
    let finishRequest: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finishRequest = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWorkspace({ initialPrompt: report.prompt });

    expect(await screen.findAllByText("Research in progress")).toHaveLength(1);
    finishRequest?.(
      Response.json({
        report,
        persistence: {
          status: "saved",
          runId: "db19db89-670b-4307-900c-c1a9e80c488a",
        },
      }),
    );
    await waitFor(() => {
      expect(screen.getAllByRole("article")).toHaveLength(3);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("complementary", { name: "Research request" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Research results" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Research complete")).toBeInTheDocument();
    expect(screen.getByText("3 directions")).toBeInTheDocument();
    expect(screen.getAllByText("1 source")).toHaveLength(2);
    expect(screen.getAllByText(/limited evidence/i)).toHaveLength(3);
  });

  it("restores previous prompts newest-first and loads a selected prompt", async () => {
    const historyStore = new LocalPromptHistoryStore(window.localStorage);
    historyStore.save("An older finance research prompt");
    historyStore.save("The newest finance research prompt");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });

    const history = await screen.findByRole("region", {
      name: "Previous prompts",
    });
    const promptButtons = within(history).getAllByRole("button", {
      pressed: false,
    });
    expect(promptButtons.map((button) => button.textContent)).toEqual([
      "The newest finance research prompt",
      "An older finance research prompt",
    ]);

    await user.click(promptButtons[1]);

    expect(screen.getByLabelText("Research prompt")).toHaveValue(
      "An older finance research prompt",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("restores a saved completed session without another research request", async () => {
    const historyStore = new LocalPromptHistoryStore(window.localStorage);
    historyStore.saveCompleted({
      report,
      persistence: {
        status: "saved",
        runId: "db19db89-670b-4307-900c-c1a9e80c488a",
      },
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });
    const history = await screen.findByRole("region", {
      name: "Previous prompts",
    });
    await user.click(within(history).getByRole("button", { name: report.prompt }));

    expect(screen.getByLabelText("Research prompt")).toHaveValue(report.prompt);
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByText("Research complete")).toBeInTheDocument();
    const reportTitle = screen.getByRole("heading", { name: report.prompt });
    const removeButton = screen.getByRole("button", {
      name: "Remove research from history",
    });
    expect(reportTitle.parentElement).toContainElement(removeButton);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cancels deletion from previous prompts without changing the active session", async () => {
    const inactivePrompt = "Research for independent neighborhood bookstores";
    const historyStore = new LocalPromptHistoryStore(window.localStorage);
    historyStore.save(inactivePrompt);
    historyStore.saveCompleted({
      report,
      persistence: { status: "saved", runId: "active-run" },
    });
    vi.stubGlobal("fetch", vi.fn());
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });
    const history = await screen.findByRole("region", {
      name: "Previous prompts",
    });
    await user.click(within(history).getByRole("button", { name: report.prompt }));
    await user.click(within(history).getByRole("button", {
      name: `Delete research: ${inactivePrompt}`,
    }));

    expect(screen.getByLabelText("Research prompt")).toHaveValue(report.prompt);
    expect(screen.getAllByRole("article")).toHaveLength(3);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText("Saved research")).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", {
      name: "Close delete confirmation",
    }));

    expect(historyStore.load()).toEqual([report.prompt, inactivePrompt]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });

  it("deletes an inactive previous prompt without disturbing the active report", async () => {
    const inactivePrompt = "Research for independent neighborhood bookstores";
    const historyStore = new LocalPromptHistoryStore(window.localStorage);
    historyStore.save(inactivePrompt);
    historyStore.saveCompleted({
      report,
      persistence: { status: "saved", runId: "active-run" },
    });
    vi.stubGlobal("fetch", vi.fn());
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });
    const history = await screen.findByRole("region", {
      name: "Previous prompts",
    });
    await user.click(within(history).getByRole("button", { name: report.prompt }));
    await user.click(within(history).getByRole("button", {
      name: `Delete research: ${inactivePrompt}`,
    }));
    expect(screen.getByLabelText("Research prompt")).toHaveValue(report.prompt);
    await user.click(screen.getByRole("button", { name: "Delete research" }));

    await waitFor(() => expect(historyStore.load()).toEqual([report.prompt]));
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByLabelText("Research prompt")).toHaveValue(report.prompt);
    expect(within(history).queryByText(inactivePrompt)).not.toBeInTheDocument();
  });

  it("deletes the active session from the report header and returns to the idle state", async () => {
    const historyStore = new LocalPromptHistoryStore(window.localStorage);
    historyStore.saveCompleted({
      report,
      persistence: { status: "saved", runId: "active-run" },
    });
    vi.stubGlobal("fetch", vi.fn());
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });
    const history = await screen.findByRole("region", {
      name: "Previous prompts",
    });
    await user.click(within(history).getByRole("button", { name: report.prompt }));
    await user.click(screen.getByRole("button", { name: /remove research/i }));
    await user.click(screen.getByRole("button", { name: "Delete research" }));

    await waitFor(() => expect(historyStore.load()).toEqual([]));
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText("Results will collect here.")).toBeInTheDocument();
    expect(screen.getByLabelText("Research prompt")).toHaveValue("");
    expect(screen.queryByRole("region", { name: "Previous prompts" }))
      .not.toBeInTheDocument();
  });

  it("deletes the active session from its history trash button", async () => {
    const historyStore = new LocalPromptHistoryStore(window.localStorage);
    historyStore.saveCompleted({
      report,
      persistence: { status: "saved", runId: "active-run" },
    });
    vi.stubGlobal("fetch", vi.fn());
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });
    const history = await screen.findByRole("region", {
      name: "Previous prompts",
    });
    await user.click(within(history).getByRole("button", { name: report.prompt }));
    await user.click(within(history).getByRole("button", {
      name: `Delete research: ${report.prompt}`,
    }));
    await user.click(screen.getByRole("button", { name: "Delete research" }));

    await waitFor(() => expect(historyStore.load()).toEqual([]));
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText("Results will collect here.")).toBeInTheDocument();
  });

  it("finishes the GSAP history exit before deleting the persisted entry", async () => {
    const historyStore = new LocalPromptHistoryStore(window.localStorage);
    historyStore.saveCompleted({
      report,
      persistence: { status: "saved", runId: "active-run" },
    });
    gsapMocks.autoCompleteTimeline = false;
    vi.stubGlobal("fetch", vi.fn());
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });
    const history = await screen.findByRole("region", {
      name: "Previous prompts",
    });
    await user.click(within(history).getByRole("button", {
      name: `Delete research: ${report.prompt}`,
    }));
    await user.click(screen.getByRole("button", { name: "Delete research" }));

    expect(historyStore.load()).toEqual([report.prompt]);
    expect(within(history).getByRole("button", {
      name: `Delete research: ${report.prompt}`,
    })).toBeDisabled();
    expect(gsapMocks.timeline).toHaveBeenCalledOnce();
    expect(gsapMocks.timelineTo).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ autoAlpha: 0, scale: 0.96, x: 20 }),
    );

    await act(async () => {
      gsapMocks.timelineCompletions[0]?.();
    });

    await waitFor(() => expect(historyStore.load()).toEqual([]));
  });

  it("uses a minimal history exit when reduced motion is requested", async () => {
    stubReducedMotion(true);
    const historyStore = new LocalPromptHistoryStore(window.localStorage);
    historyStore.save(report.prompt);
    vi.stubGlobal("fetch", vi.fn());
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });
    const history = await screen.findByRole("region", {
      name: "Previous prompts",
    });
    await user.click(within(history).getByRole("button", {
      name: `Delete research: ${report.prompt}`,
    }));
    await user.click(screen.getByRole("button", { name: "Delete research" }));

    await waitFor(() => expect(historyStore.load()).toEqual([]));
    expect(gsapMocks.timelineTo).toHaveBeenCalledTimes(1);
    expect(gsapMocks.timelineTo).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ autoAlpha: 0, duration: 0.08 }),
    );
  });

  it("animates and deletes multiple history items sequentially", async () => {
    const olderPrompt = "Research tools for neighborhood repair cafes";
    const newerPrompt = "Research tools for independent music teachers";
    const historyStore = new LocalPromptHistoryStore(window.localStorage);
    historyStore.save(olderPrompt);
    historyStore.save(newerPrompt);
    vi.stubGlobal("fetch", vi.fn());
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });
    const history = await screen.findByRole("region", {
      name: "Previous prompts",
    });
    for (const promptToDelete of [newerPrompt, olderPrompt]) {
      await user.click(within(history).getByRole("button", {
        name: `Delete research: ${promptToDelete}`,
      }));
      await user.click(screen.getByRole("button", { name: "Delete research" }));
      await waitFor(() => {
        expect(screen.queryByRole("button", { name: promptToDelete }))
          .not.toBeInTheDocument();
      });
    }

    expect(historyStore.load()).toEqual([]);
    expect(gsapMocks.timeline).toHaveBeenCalledTimes(2);
  });

  it("keeps the active item visible and reports a persistence deletion failure", async () => {
    const historyStore = new LocalPromptHistoryStore(window.localStorage);
    historyStore.saveCompleted({
      report,
      persistence: { status: "saved", runId: "active-run" },
    });
    vi.stubGlobal("fetch", vi.fn());
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });
    const history = await screen.findByRole("region", {
      name: "Previous prompts",
    });
    await user.click(within(history).getByRole("button", { name: report.prompt }));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    });
    await user.click(screen.getByRole("button", { name: /remove research/i }));
    await user.click(screen.getByRole("button", { name: "Delete research" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Research could not be deleted. Please try again.",
    );
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(within(history).getByRole("button", { name: report.prompt }))
      .toBeInTheDocument();
    expect(gsapMocks.set).toHaveBeenLastCalledWith(
      expect.any(HTMLElement),
      { clearProps: "all" },
    );
  });

  it("saves a submitted prompt without waiting for the provider response", async () => {
    let finishRequest: ((response: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finishRequest = resolve;
          }),
      ),
    );
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });
    await user.type(
      screen.getByLabelText("Research prompt"),
      "A finance tracking app for independent studios",
    );
    await user.click(screen.getByRole("button", { name: "Run research" }));

    await waitFor(() => {
      expect(new LocalPromptHistoryStore(window.localStorage).load()).toEqual([
        "A finance tracking app for independent studios",
      ]);
    });

    finishRequest?.(
      Response.json({
        report,
        persistence: {
          status: "saved",
          runId: "db19db89-670b-4307-900c-c1a9e80c488a",
        },
      }),
    );
  });

  it("keeps the completed report visible when database persistence fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ report, persistence: { status: "failed" } }),
      ),
    );
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });
    await user.type(screen.getByLabelText("Research prompt"), report.prompt);
    await user.click(screen.getByRole("button", { name: "Run research" }));

    expect(await screen.findAllByText("Research complete")).toHaveLength(2);
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByText(/could not be saved/i)).toBeInTheDocument();
  });

  it("opens authentication instead of calling research for an anonymous prompt", async () => {
    const openAuth = vi.fn();
    const requireAuth = vi.fn(() => false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderWorkspace(
      { initialPrompt: "" },
      authContext({ user: null, openAuth, requireAuth }),
    );

    await waitFor(() => {
      expect(openAuth).toHaveBeenCalledWith("login", { kind: "open_research" });
    });
    expect(screen.getByLabelText("Research prompt")).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reopens authentication and preserves the prompt after an API 401", async () => {
    const openAuth = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({
        error: {
          code: "AUTH_REQUIRED",
          message: "Log in to continue.",
          retryable: true,
        },
      }, { status: 401 })),
    );
    const user = userEvent.setup();
    renderWorkspace({ initialPrompt: "" }, authContext({ openAuth }));

    await user.type(screen.getByLabelText("Research prompt"), report.prompt);
    await user.click(screen.getByRole("button", { name: "Run research" }));

    await waitFor(() => {
      expect(openAuth).toHaveBeenCalledWith("login", {
        kind: "run_research",
        prompt: report.prompt,
      });
    });
    expect(screen.queryByText("Research stopped")).not.toBeInTheDocument();
  });

  it("distinguishes a non-JSON application response from provider failure", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>development compile error</html>", {
        status: 500,
        headers: { "Content-Type": "text/html" },
      })),
    );
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });
    await user.type(screen.getByLabelText("Research prompt"), report.prompt);
    await user.click(screen.getByRole("button", { name: "Run research" }));

    expect(await screen.findByText(
      "ProjectScout returned an unexpected response. Please try again.",
    )).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith(
      "[research-client] Request failed",
      expect.objectContaining({
        category: "unexpected_response",
        status: 500,
        contentType: "text/html",
      }),
    );
  });

  it("distinguishes browser network failure from an upstream provider response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }));
    const user = userEvent.setup();

    renderWorkspace({ initialPrompt: "" });
    await user.type(screen.getByLabelText("Research prompt"), report.prompt);
    await user.click(screen.getByRole("button", { name: "Run research" }));

    expect(await screen.findByText(
      "ProjectScout could not contact its research API. Check that the app server is running, then try again.",
    )).toBeInTheDocument();
    expect(screen.queryByText("The research service could not be reached."))
      .not.toBeInTheDocument();
  });
});
