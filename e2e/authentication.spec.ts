import {
  expect,
  expectNoSeriousAccessibilityViolations,
  installFakeBackend,
  logIn,
  TEST_EMAIL,
  TEST_PASSWORD,
  test,
} from "./fixtures";
import { chromium } from "@playwright/test";

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

test("duplicate signup has the same privacy-preserving response", async ({ page }) => {
  await page.route("http://127.0.0.1:54321/auth/v1/signup**", (route) =>
    route.fulfill({
      status: 422,
      headers: { "X-Supabase-Api-Version": "2024-01-01" },
      json: {
        code: "user_already_exists",
        error_code: "user_already_exists",
        message: "User already registered",
      },
    }), { times: 1 });
  await page.goto("/");
  await page.locator(".site-header__action")
    .getByRole("button", { name: "Sign up for free" }).click();
  const dialog = page.getByRole("dialog", { name: "Create your account" });
  await dialog.getByLabel("Email address").fill(TEST_EMAIL);
  await dialog.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await dialog.getByLabel("Confirm password").fill(TEST_PASSWORD);
  await dialog.getByRole("button", { name: "Create account" }).click();

  const checkEmailDialog = page.getByRole("dialog", { name: "Check your email" });
  await expect(checkEmailDialog.getByText(
    "If this address is eligible, you’ll receive an email shortly.",
  )).toBeVisible();
});

test("login and logout update navigation without production services", async ({ page, backend }) => {
  await page.goto("/");
  await logIn(page);
  await expect(page).toHaveURL(/\/research(?:\?|$)/);
  await expect(page.locator(".site-header__action summary")).toHaveAccessibleName(
    `Account menu for ${TEST_EMAIL}`,
  );
  await page.locator(".site-header__action summary").click();
  await page.locator(".site-header__action").getByRole("button", { name: "Log out" })
    .dispatchEvent("click");

  await expect(page.locator(".site-header__action").getByRole("button", { name: "Log in" })).toBeVisible();
  expect(backend.authOperations.some((operation) => operation.includes("/logout"))).toBe(true);
});

test("an authenticated session can return to the landing page", async ({ page, backend }) => {
  await page.goto("/");
  await logIn(page);
  await expect(page).toHaveURL(/\/research(?:\?|$)/);

  const userRequestsBeforeReturn = backend.authOperations.filter((operation) =>
    operation.startsWith("GET /auth/v1/user")
  ).length;
  await page.goto("/");

  await expect.poll(() => backend.authOperations.filter((operation) =>
    operation.startsWith("GET /auth/v1/user")
  ).length).toBeGreaterThan(userRequestsBeforeReturn);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", {
    level: 1,
    name: "Build better projects. Start with evidence.",
  })).toBeVisible();
  await expect(page.locator(".site-header__action summary"))
    .toHaveAccessibleName(`Account menu for ${TEST_EMAIL}`);
});

test("session survives closing and reopening a persistent browser", async ({ backend }, testInfo) => {
  const profileDirectory = testInfo.outputPath("persistent-browser-profile");
  const baseURL = String(testInfo.project.use.baseURL);
  let context = await chromium.launchPersistentContext(profileDirectory, {
    baseURL,
    headless: true,
  });

  try {
    await installFakeBackend(context, backend);
    let persistentPage = context.pages()[0] ?? await context.newPage();
    await persistentPage.goto("/");
    await logIn(persistentPage);
    await expect(persistentPage).toHaveURL(/\/research(?:\?|$)/);
    await context.close();

    context = await chromium.launchPersistentContext(profileDirectory, {
      baseURL,
      headless: true,
    });
    await installFakeBackend(context, backend);
    persistentPage = context.pages()[0] ?? await context.newPage();
    const userRequestsBeforeReopen = backend.authOperations.filter((operation) =>
      operation.startsWith("GET /auth/v1/user")
    ).length;
    await persistentPage.goto("/");

    await expect.poll(() => backend.authOperations.filter((operation) =>
      operation.startsWith("GET /auth/v1/user")
    ).length).toBeGreaterThan(userRequestsBeforeReopen);
    await expect(persistentPage).toHaveURL(/\/$/);
    await expect(persistentPage.getByRole("heading", {
      level: 1,
      name: "Build better projects. Start with evidence.",
    })).toBeVisible();
    await expect(persistentPage.locator(".site-header__action summary"))
      .toHaveAccessibleName(`Account menu for ${TEST_EMAIL}`);
  } finally {
    await context.close();
  }
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
  await expect(page).toHaveURL(/\/research(?:\?|$)/);
  await page.locator(".site-header__action summary").click();
  await page.locator(".site-header__action").getByRole("button", { name: "Settings" })
    .dispatchEvent("click");
  await page.locator(".site-header__action").getByRole("button", { name: "Delete account" })
    .dispatchEvent("click");
  const dialog = page.getByRole("dialog", { name: "Delete your account?" });
  await expectNoSeriousAccessibilityViolations(page, ".account-deletion-dialog");
  if (!(await dialog.isVisible())) {
    await page.locator(".site-header__action summary").click();
    await page.locator(".site-header__action").getByRole("button", { name: "Settings" })
      .dispatchEvent("click");
    await page.locator(".site-header__action").getByRole("button", { name: "Delete account" })
      .dispatchEvent("click");
  }
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete account" })
    .dispatchEvent("click");

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

test("authentication dialog stays open during interaction and closes intentionally", async ({ page }) => {
  await page.goto("/");
  await page.locator(".site-header__action").getByRole("button", { name: "Log in" }).click();
  const loginDialog = page.getByRole("dialog", { name: "Continue your research" });
  await loginDialog.getByLabel("Email address").click();
  await page.mouse.move(0, 0);
  await expect(loginDialog).toBeVisible();

  await loginDialog.getByRole("button", { name: "Sign up" }).click();
  const signupDialog = page.getByRole("dialog", { name: "Create your account" });
  await signupDialog.getByLabel("Email address").fill("invalid");
  await signupDialog.getByLabel("Password", { exact: true }).fill("weak");
  await signupDialog.getByLabel("Confirm password").fill("different");
  await signupDialog.getByRole("button", { name: "Create account" }).click();
  await expect(signupDialog.getByText("Enter a valid email address.")).toBeVisible();
  await expect(signupDialog.getByText(
    "Use at least 8 characters with a letter, number, and symbol.",
  )).toBeVisible();
  await expect(signupDialog.getByText("Enter the same password in both fields.")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(signupDialog).toBeHidden();

  await page.locator(".site-header__action").getByRole("button", { name: "Log in" }).click();
  await page.mouse.click(2, 2);
  await expect(loginDialog).toBeHidden();
});

test("invalid credentials and service outages show different login errors", async ({ page }) => {
  await page.route("http://127.0.0.1:54321/auth/v1/token**", (route) => route.fulfill({
    status: 400,
    json: { code: "invalid_credentials", message: "Invalid login credentials" },
  }), { times: 1 });
  await page.goto("/");
  await page.locator(".site-header__action").getByRole("button", { name: "Log in" }).click();
  const dialog = page.getByRole("dialog", { name: "Continue your research" });
  await dialog.getByLabel("Email address").fill(TEST_EMAIL);
  await dialog.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await dialog.locator("button[type='submit']").click();

  await expect(dialog.getByText(
    "Login could not be completed. Check your email and password, or request a password reset.",
  )).toBeVisible();
  await expect(dialog.getByText(/connection/i)).toBeHidden();

  await page.route("http://127.0.0.1:54321/auth/v1/token**", (route) =>
    route.abort("failed"), { times: 1 });
  await dialog.locator("button[type='submit']").click();
  await expect(dialog.getByText(
    "The authentication service is unavailable. Try again shortly; your research prompt is still saved.",
  )).toBeVisible();
});
