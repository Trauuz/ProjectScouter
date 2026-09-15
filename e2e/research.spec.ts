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
