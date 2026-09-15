import { test as base, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const TEST_USER_ID = "05eb1d2c-a1ec-43f0-8967-24299194382a";
const TEST_EMAIL = "scout@example.test";
const TEST_PASSWORD = "Test-pass1!";

function base64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

const ACCESS_TOKEN = [
  base64Url({ alg: "HS256", typ: "JWT" }),
  base64Url({
    aud: "authenticated",
    exp: 4_102_444_800,
    sub: TEST_USER_ID,
    email: TEST_EMAIL,
    role: "authenticated",
  }),
  "deterministic-e2e-signature",
].join(".");

const USER = {
  id: TEST_USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: TEST_EMAIL,
  email_confirmed_at: "2026-09-01T00:00:00.000Z",
  phone: "",
  confirmed_at: "2026-09-01T00:00:00.000Z",
  last_sign_in_at: "2026-09-15T00:00:00.000Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-15T00:00:00.000Z",
  is_anonymous: false,
};

const SESSION = {
  access_token: ACCESS_TOKEN,
  token_type: "bearer",
  expires_in: 2_147_483_647,
  expires_at: 4_102_444_800,
  refresh_token: "deterministic-e2e-refresh-token",
  user: USER,
};

const RESEARCH_RESPONSE = {
  report: {
    prompt: "Tools for community garden coordinators",
    summary: "Coordinators need a simple way to schedule shared work.",
    generatedAt: "2026-09-15T00:00:00.000Z",
    sources: [{
      id: "src-1",
      title: "Community garden operations",
      url: "https://example.test/gardens",
      snippet: "Volunteer scheduling is a recurring coordination problem.",
      publishedAt: "2026-09-01T00:00:00.000Z",
    }],
    recommendations: [{
      title: "Garden shift board",
      targetUser: "Community garden coordinators",
      problem: "Volunteer shifts are coordinated manually.",
      proposedSolution: "A small shared scheduling board.",
      mvpFeatures: ["Shift calendar", "Volunteer reminders"],
      scopeEstimate: "small",
      similarProducts: [],
      differentiation: "Designed for rotating garden tasks.",
      risks: ["Low volunteer adoption"],
      validationExperiment: "Pilot with one garden for two weeks.",
      evidenceSourceIds: ["src-1"],
      evidenceStrength: "strong",
      weakEvidence: false,
    }],
  },
  persistence: {
    status: "saved",
    runId: "2a1a66b1-f065-4334-889e-935b40958580",
  },
};

export type FakeBackend = {
  researchRequests: number;
  accountDeletionRequests: number;
  authOperations: string[];
  researchDelayMs: number;
};

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "http://127.0.0.1:3100",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

async function mockSupabase(route: Route, backend: FakeBackend): Promise<void> {
  const request = route.request();
  if (request.method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: corsHeaders() });
    return;
  }

  const url = new URL(request.url());
  const operation = `${request.method()} ${url.pathname}${url.search}`;
  backend.authOperations.push(operation);
  const headers = corsHeaders();
  if (url.pathname.endsWith("/token")) {
    await route.fulfill({ status: 200, json: SESSION, headers });
    return;
  }
  if (url.pathname.endsWith("/signup")) {
    await route.fulfill({ status: 200, json: { user: USER, session: null }, headers });
    return;
  }
  if (url.pathname.endsWith("/recover") || url.pathname.endsWith("/logout")) {
    await route.fulfill({ status: 200, json: {}, headers });
    return;
  }
  if (url.pathname.endsWith("/user")) {
    const authenticated = request.headers().authorization?.includes(ACCESS_TOKEN);
    await route.fulfill(authenticated
      ? { status: 200, json: USER, headers }
      : { status: 401, json: { message: "User not found" }, headers });
    return;
  }
  await route.fulfill({ status: 404, json: { message: "Unhandled test route" }, headers });
}

export const test = base.extend<{ backend: FakeBackend }>({
  backend: [async ({ page }, use) => {
    const backend: FakeBackend = {
      researchRequests: 0,
      accountDeletionRequests: 0,
      authOperations: [],
      researchDelayMs: 0,
    };

    await page.route("http://127.0.0.1:54321/**", (route) =>
      mockSupabase(route, backend));
    await page.route("**/api/research", async (route) => {
      backend.researchRequests += 1;
      if (backend.researchDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, backend.researchDelayMs));
      }
      await route.fulfill({ status: 200, json: RESEARCH_RESPONSE });
    });
    await page.route("**/api/auth/claim-runs", (route) =>
      route.fulfill({ status: 200, json: { attached: 0 } }));
    await page.route("**/api/usage", (route) => route.fulfill({
      status: 200,
      json: {
        limit: 5,
        used: 0,
        remaining: 5,
        periodStart: "2026-09-01",
        resetsAt: "2026-10-01T00:00:00.000Z",
      },
    }));
    await page.route("**/api/account", (route) => {
      backend.accountDeletionRequests += 1;
      return route.fulfill({ status: 204, body: "" });
    });
    await page.route("https://**/*", (route) => route.abort("blockedbyclient"));

    await use(backend);
  }, { auto: true }],
});

export { expect, TEST_EMAIL, TEST_PASSWORD };

export async function logIn(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: "Continue your research" });
  const openedAutomatically = await dialog.waitFor({ state: "visible", timeout: 1_000 })
    .then(() => true)
    .catch(() => false);
  if (!openedAutomatically) {
    await page.locator(".site-header__action").getByRole("button", { name: "Log in" }).click();
  }
  await dialog.getByLabel("Email address").fill(TEST_EMAIL);
  await dialog.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await dialog.locator("button[type='submit']").click();
  await expect(page.getByRole("dialog", { name: "Continue your research" })).toBeHidden();
}

export async function expectNoSeriousAccessibilityViolations(
  page: Page,
  include?: string,
): Promise<void> {
  const builder = new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
  ]);
  if (include) {
    builder.include(include);
  }
  const results = await builder.analyze();
  const serious = results.violations.filter((violation) =>
    violation.impact === "serious" || violation.impact === "critical");
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}
