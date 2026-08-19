// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthContext, type AuthContextValue } from "@/features/auth/auth-context";
import { LocalPromptHistoryStore } from "../prompt-history/prompt-history-store";
import { ResearchWorkspace } from "./research-workspace";

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

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("ResearchWorkspace", () => {
  it("does not render the redundant workspace status header", () => {
    vi.stubGlobal("fetch", vi.fn());

    renderWorkspace({ initialPrompt: "" });

    expect(screen.queryByText("Project research")).not.toBeInTheDocument();
    expect(screen.queryByText("Ready for a prompt")).not.toBeInTheDocument();
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
    const promptButtons = within(history).getAllByRole("button");
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
    expect(fetchMock).not.toHaveBeenCalled();
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
