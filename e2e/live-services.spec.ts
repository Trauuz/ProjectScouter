import { expect, test } from "@playwright/test";

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for the opted-in live E2E suite.`);
  }
  return value;
}

test.describe("live external services", () => {
  test.describe.configure({ mode: "serial" });

  test("an authenticated account completes research through the real providers", async ({ page }) => {
    test.skip(
      process.env.RUN_LIVE_PROVIDER_E2E !== "true",
      "Set RUN_LIVE_PROVIDER_E2E=true with LIVE_E2E_EMAIL and LIVE_E2E_PASSWORD to spend one live research credit.",
    );
    const email = requiredEnvironment("LIVE_E2E_EMAIL");
    const password = requiredEnvironment("LIVE_E2E_PASSWORD");

    await page.goto("/research");
    const dialog = page.getByRole("dialog", { name: "Continue your research" });
    await dialog.getByLabel("Email address").fill(email);
    await dialog.getByLabel("Password", { exact: true }).fill(password);
    await dialog.locator("button[type='submit']").click();
    await expect(dialog).toBeHidden();

    const prompt = `Developer tools for maintaining community gardens (${Date.now()})`;
    await page.getByLabel("Research prompt").fill(prompt);
    await page.getByRole("button", { name: "Run research" }).click();

    await expect(page.getByText("Research complete", { exact: true }).first())
      .toBeVisible({ timeout: 100_000 });
    await expect(page.locator(".recommendation-card")).toHaveCount(3);
    expect(await page.locator(".source-index li").count()).toBeGreaterThan(0);
  });

  test("live signup keeps a duplicate address indistinguishable", async ({ page }) => {
    test.skip(
      process.env.RUN_LIVE_SIGNUP_E2E !== "true",
      "Set RUN_LIVE_SIGNUP_E2E=true with a dedicated LIVE_E2E_SIGNUP_EMAIL and LIVE_E2E_SIGNUP_PASSWORD; this can send signup email.",
    );
    const email = requiredEnvironment("LIVE_E2E_SIGNUP_EMAIL");
    const password = requiredEnvironment("LIVE_E2E_SIGNUP_PASSWORD");
    const expectedMessage = "If this address is eligible, you’ll receive an email shortly.";

    await page.goto("/");
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await page.locator(".site-header__action")
        .getByRole("button", { name: "Sign up for free" }).click();
      const dialog = page.getByRole("dialog", { name: "Create your account" });
      await dialog.getByLabel("Email address").fill(email);
      await dialog.getByLabel("Password", { exact: true }).fill(password);
      await dialog.getByLabel("Confirm password").fill(password);
      await dialog.getByRole("button", { name: "Create account" }).click();

      const checkEmailDialog = page.getByRole("dialog", { name: "Check your email" });
      await expect(checkEmailDialog.getByText(expectedMessage)).toBeVisible();
      await checkEmailDialog.getByRole("button", { name: "Close" }).click();
    }
  });
});
