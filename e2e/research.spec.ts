import { expect, logIn, test } from "./fixtures";

const PROMPT = "Tools for community garden coordinators";

async function openAuthenticatedResearch(page: Parameters<typeof logIn>[0]) {
  await page.goto("/research");
  await logIn(page);
  await expect(page.getByLabel("Research prompt")).toBeEnabled();
}

test("submits research using deterministic provider output", async ({ page, backend }) => {
  await openAuthenticatedResearch(page);
  await page.getByLabel("Research prompt").fill(PROMPT);
  await page.getByRole("button", { name: "Run research" }).click();

  await expect(page.getByText("Research complete", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: PROMPT })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Garden shift board" })).toBeVisible();
  expect(backend.researchRequests).toBe(1);
});

test("a duplicate submit while research is pending does not create another request", async ({ page, backend }) => {
  backend.researchDelayMs = 300;
  await openAuthenticatedResearch(page);
  await page.getByLabel("Research prompt").fill(PROMPT);
  const submit = page.getByRole("button", { name: "Run research" });
  await submit.dblclick();

  await expect(page.getByText("Research complete", { exact: true }).first()).toBeVisible();
  expect(backend.researchRequests).toBe(1);
});

test("deletes a completed report from browser history", async ({ page }) => {
  await openAuthenticatedResearch(page);
  await page.getByLabel("Research prompt").fill(PROMPT);
  await page.getByRole("button", { name: "Run research" }).click();
  await expect(page.getByRole("heading", { name: PROMPT })).toBeVisible();
  await page.getByRole("button", { name: "Remove research from this browser" }).click();
  const dialog = page.getByRole("dialog", { name: "Remove from this browser?" });
  await dialog.getByRole("button", { name: "Remove", exact: true }).click();

  await expect(page.getByRole("heading", { name: PROMPT })).toBeHidden();
  const storageValue = await page.evaluate(() =>
    localStorage.getItem("projectscout.research.prompt-history.v1"));
  expect(storageValue ?? "").not.toContain(PROMPT);
});

test("restores the correct saved report after refresh without another request", async ({ page, backend }) => {
  const firstPrompt = "Tools for community garden coordinators";
  const secondPrompt = "Tools for neighborhood recycling coordinators";
  await openAuthenticatedResearch(page);

  for (const prompt of [firstPrompt, secondPrompt]) {
    await page.getByLabel("Research prompt").fill(prompt);
    await page.getByRole("button", { name: /Run (?:new )?research/ }).click();
    await expect(page.getByRole("heading", { name: prompt })).toBeVisible();
  }
  expect(backend.researchRequests).toBe(2);

  await page.reload();
  await expect(page.getByLabel("Research prompt")).toBeEnabled();
  await page.locator(`button[title="${firstPrompt}"]`).click();

  await expect(page.getByRole("heading", { name: firstPrompt })).toBeVisible();
  expect(backend.researchRequests).toBe(2);

  await page.locator(`button[title="${secondPrompt}"]`).click();
  await expect(page.getByRole("heading", { name: secondPrompt })).toBeVisible();
  expect(backend.researchRequests).toBe(2);
});

test("cancel keeps history and deleting an inactive report preserves the active report", async ({ page }) => {
  const firstPrompt = "Tools for community garden coordinators";
  const secondPrompt = "Tools for neighborhood recycling coordinators";
  await openAuthenticatedResearch(page);

  for (const prompt of [firstPrompt, secondPrompt]) {
    await page.getByLabel("Research prompt").fill(prompt);
    await page.getByRole("button", { name: /Run (?:new )?research/ }).click();
    await expect(page.getByRole("heading", { name: prompt })).toBeVisible();
  }

  await page.getByRole("button", { name: `Delete research: ${firstPrompt}` }).click();
  const dialog = page.getByRole("dialog", { name: "Remove from this browser?" });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: `Delete research: ${firstPrompt}` })).toBeVisible();

  await page.getByRole("button", { name: `Delete research: ${firstPrompt}` }).click();
  await dialog.getByRole("button", { name: "Remove", exact: true }).click();

  await expect(page.getByRole("button", { name: `Delete research: ${firstPrompt}` })).toBeHidden();
  await expect(page.getByRole("heading", { name: secondPrompt })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: `Delete research: ${firstPrompt}` })).toBeHidden();
});

test("shows distinct provider, timeout, invalid-response, and network failures", async ({ page }) => {
  await openAuthenticatedResearch(page);

  const cases = [
    {
      fulfill: { status: 503, json: { error: {
        code: "UPSTREAM_FAILED",
        message: "Research providers are temporarily unavailable. Please try again shortly.",
        retryable: true,
      } } },
      message: "Research providers are temporarily unavailable. Please try again shortly.",
    },
    {
      fulfill: { status: 200, contentType: "text/html", body: "not json" },
      message: "ProjectScout returned an unexpected response. Please try again.",
    },
    {
      fulfill: { status: 504, json: { error: {
        code: "UPSTREAM_TIMEOUT",
        message: "Research took too long. Please try again.",
        retryable: true,
      } } },
      message: "Research took too long. Please try again.",
    },
  ] as const;

  for (const testCase of cases) {
    await page.route("**/api/research", (route) => route.fulfill(testCase.fulfill), { times: 1 });
    await page.getByLabel("Research prompt").fill(PROMPT);
    await page.getByRole("button", { name: "Run research" }).click();
    await expect(page.getByText(testCase.message)).toBeVisible();
  }

  await page.route("**/api/research", (route) => route.abort("failed"), { times: 1 });
  await page.getByLabel("Research prompt").fill(PROMPT);
  await page.getByRole("button", { name: "Run research" }).click();
  await expect(page.getByText(
    "ProjectScout could not contact its research API. Check that the app server is running, then try again.",
  )).toBeVisible();
});

test("browser validation blocks empty and short prompts without an API request", async ({ page, backend }) => {
  await openAuthenticatedResearch(page);
  const prompt = page.getByLabel("Research prompt");

  await page.getByRole("button", { name: "Run research" }).click();
  expect(await prompt.evaluate((element: HTMLTextAreaElement) => element.validationMessage))
    .not.toBe("");

  await prompt.fill("short");
  await page.getByRole("button", { name: "Run research" }).click();
  expect(await prompt.evaluate((element: HTMLTextAreaElement) => element.validationMessage))
    .not.toBe("");
  expect(backend.researchRequests).toBe(0);
});

test("research workspace stays within supported viewports and mobile navigation traps focus", async ({ page }) => {
  await openAuthenticatedResearch(page);

  for (const viewport of [
    { width: 1_440, height: 900 },
    { width: 1_280, height: 720 },
    { width: 1_024, height: 600 },
    { width: 768, height: 1_024 },
    { width: 390, height: 844 },
    { width: 360, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.documentWidth, JSON.stringify({ viewport, overflow }))
      .toBeLessThanOrEqual(overflow.viewportWidth);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = page.getByRole("button", { name: "Open research navigation" });
  await trigger.click();
  const navigation = page.getByRole("dialog", { name: "Research navigation" });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Close research navigation" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(trigger).toBeFocused();
});
