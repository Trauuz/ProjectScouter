import { expect, test } from "./fixtures";

const VIEWPORTS = [
  { width: 1_440, height: 900 },
  { width: 1_280, height: 720 },
  { width: 1_024, height: 600 },
  { width: 768, height: 1_024 },
  { width: 414, height: 896 },
  { width: 390, height: 844 },
  { width: 375, height: 812 },
  { width: 360, height: 800 },
  { width: 320, height: 720 },
] as const;

test("direct hash entry hydrates the current landing-page markup", async ({ page }) => {
  const hydrationFailures: string[] = [];
  const recordHydrationFailure = (message: string) => {
    if (message.includes("Hydration failed")) {
      hydrationFailures.push(message);
    }
  };

  page.on("console", (message) => recordHydrationFailure(message.text()));
  page.on("pageerror", (error) => recordHydrationFailure(error.message));

  await page.goto("/#how-it-works");
  await expect(page.locator("#trust.landing-story-module")).toBeAttached();
  await expect(page.locator("#example")).toHaveCount(0);
  await expect(page.locator("#evidence-title")).toHaveText(
    "Follow the evidence into the recommendation.",
  );

  expect(hydrationFailures).toEqual([]);
});

test("removed landing-page sections are not rendered", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#weak-evidence")).toHaveCount(0);
  await expect(page.locator("#audience")).toHaveCount(0);
  await expect(page.getByRole("heading", {
    name: "Weak evidence changes the recommendation.",
  })).toHaveCount(0);
  await expect(page.getByRole("heading", {
    name: "Research direction without a research department.",
  })).toHaveCount(0);
});

test("landing page remains usable without horizontal overflow at supported viewports", async ({ page }) => {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.goto("/");

    await expect(page.getByRole("heading", {
      level: 1,
      name: "Build better projects. Start with evidence.",
    })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeAttached();

    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.documentWidth, JSON.stringify({ viewport, overflow }))
      .toBeLessThanOrEqual(overflow.viewportWidth);
  }
});

test("mobile navigation and legal pages are reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.locator("summary", { hasText: "Menu" }).click();
  await page.getByRole("link", { name: "Process" }).click();
  await expect(page).toHaveURL(/#how-it-works$/);

  for (const path of ["/privacy-policy", "/terms-of-service"]) {
    const response = await page.goto(path);
    expect(response?.ok(), path).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("legal policies disclose cookie-free Vercel Web Analytics", async ({ page }) => {
  await page.goto("/privacy-policy");
  await expect(page.getByText(
    "Vercel hosts and delivers ProjectScout and provides Web Analytics.",
    { exact: false },
  )).toBeVisible();

  await page.goto("/cookie-policy");
  await expect(page.getByText(
    "ProjectScout uses Vercel Web Analytics to measure aggregate website traffic.",
    { exact: false },
  )).toBeVisible();
  await expect(page.getByText(
    "Vercel Web Analytics does not use analytics cookies or local storage.",
    { exact: false },
  )).toBeVisible();
});

test("scroll guide advances through all steps and reverses", async ({ page }) => {
  await page.setViewportSize({ width: 1_440, height: 900 });
  await page.goto("/");

  const guideTop = await page.locator("#how-it-works").evaluate((element) =>
    element.getBoundingClientRect().top + window.scrollY);
  const distance = Math.max(900 * (1.6 / 1.125), 800 / 1.125);

  for (const [progress, name] of [
    [0.1, "Enter a topic or app"],
    [0.5, "Find public evidence"],
    [0.9, "Compare project directions"],
  ] as const) {
    await page.evaluate((y) => window.scrollTo(0, y), guideTop + distance * progress);
    await expect(page.getByRole("listitem").filter({ hasText: name }))
      .toHaveAttribute("aria-current", "step");
  }

  await page.evaluate((y) => window.scrollTo(0, y), guideTop + distance * 0.1);
  await expect(page.getByRole("listitem").filter({ hasText: "Enter a topic or app" }))
    .toHaveAttribute("aria-current", "step");
});

test("landing story animations reset above their triggers and replay", async ({ page }) => {
  await page.setViewportSize({ width: 1_440, height: 900 });
  await page.goto("/");
  const animatedSections = [
    ["evidence", "evidence-title"],
    ["directions", "directions-title"],
    ["before-after", "transformation-title"],
    ["principles", "principles-title"],
  ] as const;

  for (const [sectionId, headingId] of animatedSections) {
    const heading = page.locator(`#${headingId}`);
    const opacity = () => heading.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).opacity));

    await page.locator(`#${sectionId}`).scrollIntoViewIfNeeded();
    await expect.poll(opacity, { message: `${sectionId} should play` })
      .toBeGreaterThan(0.95);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(opacity, { message: `${sectionId} should reset` })
      .toBeLessThan(0.05);

    await page.locator(`#${sectionId}`).scrollIntoViewIfNeeded();
    await expect.poll(opacity, { message: `${sectionId} should replay` })
      .toBeGreaterThan(0.95);
  }
});

test("every named landing story module renders as a distinct section", async ({ page }) => {
  await page.setViewportSize({ width: 1_440, height: 900 });
  await page.goto("/");

  const moduleIds = [
    "trust",
    "evidence",
    "directions",
    "before-after",
    "principles",
  ] as const;

  await expect(page.locator(".landing-story-module")).toHaveCount(moduleIds.length);
  for (const id of moduleIds) {
    const storySection = page.locator(`section#${id}.landing-story-module`);
    await expect(storySection, id).toBeAttached();
    await storySection.scrollIntoViewIfNeeded();
    await expect(storySection, id).toBeVisible();
  }
});
