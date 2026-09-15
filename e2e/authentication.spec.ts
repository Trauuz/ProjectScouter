import {
  expect,
  expectNoSeriousAccessibilityViolations,
  logIn,
  TEST_EMAIL,
  TEST_PASSWORD,
  test,
} from "./fixtures";

test("signup uses the disposable Supabase fixture", async ({ page, backend }) => {
  await page.goto("/");
  await page.locator(".site-header__action").getByRole("button", { name: "Sign up for free" }).click();
  const dialog = page.getByRole("dialog", { name: "Create your account" });
  await dialog.getByLabel("Email address").fill(TEST_EMAIL);
  await dialog.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await dialog.getByLabel("Confirm password").fill(TEST_PASSWORD);
  await dialog.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("dialog", { name: "Check your email" })).toBeVisible();
  expect(backend.authOperations.some((operation) =>
    operation.startsWith("POST /auth/v1/signup?redirect_to="))).toBe(true);
});

test("login and logout update navigation without production services", async ({ page, backend }) => {
  await page.goto("/");
  await logIn(page);
  await expect(page.locator(".site-header__action summary")).toHaveAccessibleName(
    `Account menu for ${TEST_EMAIL}`,
  );
  await page.locator(".site-header__action summary").click();
  await page.locator(".site-header__action").getByRole("button", { name: "Log out" })
    .dispatchEvent("click");

  await expect(page.locator(".site-header__action").getByRole("button", { name: "Log in" })).toBeVisible();
  expect(backend.authOperations.some((operation) => operation.includes("/logout"))).toBe(true);
});

test("password recovery sends a reset request", async ({ page, backend }) => {
  await page.goto("/");
  await page.locator(".site-header__action").getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "Forgot your password?" }).click();
  const dialog = page.getByRole("dialog", { name: "Reset your password" });
  await dialog.getByLabel("Email address").fill(TEST_EMAIL);
  await dialog.getByRole("button", { name: "Send reset link" }).click();

  await expect(page.getByRole("dialog", { name: "Check your email" })).toBeVisible();
  expect(backend.authOperations.some((operation) =>
    operation.startsWith("POST /auth/v1/recover?redirect_to="))).toBe(true);
});

test("account deletion clears the authenticated UI", async ({ page, backend }) => {
  await page.goto("/");
  await logIn(page);
  await page.locator(".site-header__action summary").click();
  await page.locator(".site-header__action").getByRole("button", { name: "Settings" })
    .dispatchEvent("click");
  await page.locator(".site-header__action").getByRole("button", { name: "Delete account" })
    .dispatchEvent("click");
  const dialog = page.getByRole("dialog", { name: "Delete your account?" });
  await expectNoSeriousAccessibilityViolations(page, ".account-deletion-dialog");
  await dialog.getByRole("button", { name: "Delete account" }).click();

  await expect(page.locator(".site-header__action").getByRole("button", { name: "Log in" })).toBeVisible();
  expect(backend.accountDeletionRequests).toBe(1);
  const storageValue = await page.evaluate(() =>
    localStorage.getItem("projectscout.research.prompt-history.v1"));
  expect(storageValue).toBeNull();
});

test("primary navigation and authentication dialog have no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expectNoSeriousAccessibilityViolations(page, ".site-header");
  await page.locator(".site-header__action").getByRole("button", { name: "Log in" }).click();
  await expectNoSeriousAccessibilityViolations(page, ".auth-dialog");
});
