import { test, expect, type Page } from "@playwright/test";

test.use({ locale: "en-US" });

test("pasting prompts for sign-in or registration and dismissal keeps the draft", async ({
  page,
  context,
}) => {
  const calls = await mockMediaApi(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate((url) => navigator.clipboard.writeText(url), source);
  await page.getByRole("button", { name: "Paste link", exact: true }).click();
  const prompt = page.getByRole("dialog", { name: "Sign in", exact: true });
  await expect(prompt).toBeVisible();
  await expect(prompt.getByLabel("Email", { exact: true })).toBeFocused();
  await expect(
    prompt.getByRole("link", { name: "Create account", exact: true })
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  expect(calls.analysis).toHaveLength(0);
  expect(calls.jobs).toHaveLength(0);
  const bounds = await prompt.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await prompt.press("Escape");
  await expect(prompt).not.toBeVisible();
  await expect(page.getByPlaceholder("https://...")).toHaveValue(source);
  await page
    .getByTestId("landing-topbar")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(prompt).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByRole("status")).toContainText("Your link is saved");
  await prompt.press("Escape");
  await page.getByPlaceholder("https://...").press("Control+V");
  await expect(prompt).toBeVisible();
  await prompt.getByRole("link", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("dialog", { name: "Create account", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Your link is saved");
  await page.setViewportSize({ width: 390, height: 540 });
  const scrollArea = page.getByTestId("auth-modal-scroll");
  const scrollMetrics = await scrollArea.evaluate((element) => ({
    scrolls: element.scrollHeight > element.clientHeight,
    thin:
      getComputedStyle(element).scrollbarWidth === "thin" ||
      getComputedStyle(element, "::-webkit-scrollbar").width === "5px",
    dialogFits:
      element.closest("dialog")!.getBoundingClientRect().bottom <= innerHeight,
  }));
  expect(scrollMetrics).toEqual({ scrolls: true, thin: true, dialogFits: true });
  await page.getByLabel("Confirm password", { exact: true }).scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Close", exact: true })
  ).toBeInViewport();
  await page
    .getByRole("button", { name: /Continue with Google|Sign up with Google/ })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByPlaceholder("https://...")).toHaveValue(source);
  await expect(page.getByText("Saved link fixture", { exact: true })).toBeVisible();
  expect(calls.analysis).toHaveLength(1);
  expect(calls.analysis[0].url).toBe(source);
});

test("invalid clipboard text stays editable without opening the auth prompt", async ({
  page,
  context,
}) => {
  const calls = await mockMediaApi(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.evaluate(() => navigator.clipboard.writeText("not a public URL"));
  await page.getByRole("button", { name: "Paste link", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByPlaceholder("https://...")).toHaveValue("not a public URL");
  await expect(
    page.getByText("Paste a valid public link starting with https:// or http://.")
  ).toBeVisible();
  expect(calls.analysis).toHaveLength(0);
});

const source = "https://example.com/public-video.mp4?quality=hd";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

async function mockMediaApi(page: Page) {
  const analysis: { url: string; authorization?: string }[] = [];
  const jobs: { rights_confirmed: boolean; url: string; authorization?: string }[] = [];
  await page.route("**/media/analyze*", async (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    analysis.push({
      url: route.request().postDataJSON().url,
      authorization: route.request().headers().authorization,
    });
    return route.fulfill({
      headers,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          policy: { decision: "allowed", reason: "Public source" },
          media: {
            title: "Saved link fixture",
            platform: "direct",
            source_domain: "example.com",
            duration_seconds: 30,
            thumbnail_url: null,
          },
          formats: [
            {
              format_id: "18",
              extension: "mp4",
              type: "video",
              quality_label: "720p",
              height: 720,
              has_video: true,
              has_audio: true,
            },
          ],
        },
        error: null,
      }),
    });
  });
  await page.route("**/downloads*", async (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (route.request().method() === "POST") {
      jobs.push({
        ...route.request().postDataJSON(),
        authorization: route.request().headers().authorization,
      });
      return route.fulfill({
        headers,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { job_id: "account-job", status: "QUEUED" },
          error: null,
        }),
      });
    }
    return route.fulfill({
      headers,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, data: { jobs: [], total: 0 }, error: null }),
    });
  });
  return { analysis, jobs };
}

test("keeps the link through failed login and reload, then confirms rights before queueing", async ({
  page,
}) => {
  const calls = await mockMediaApi(page);
  await page.goto("/");
  await page.getByRole("textbox", { name: /Paste a clip link/ }).fill(source);
  await page.getByTestId("url-submit").click();
  await expect(page).toHaveURL(/\/$/);
  const loginDialog = page.getByRole("dialog", { name: "Sign in", exact: true });
  await expect(loginDialog).toBeVisible();
  await expect(
    loginDialog.getByRole("button", { name: "Sign in", exact: true }).locator("svg")
  ).toHaveCount(0);
  expect(calls.analysis).toHaveLength(0);
  await expect(page.getByRole("status")).toContainText("Your link is saved");
  await page.getByLabel("Email", { exact: true }).fill("invalid@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Fixture-password-123");
  await loginDialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("form [role=alert]")).toBeVisible();
  await page.reload();
  await expect(page.getByPlaceholder("https://...")).toHaveValue(source);
  await page.getByTestId("url-submit").click();
  await expect(page.getByRole("status")).toContainText("Your link is saved");
  await page.getByLabel("Email", { exact: true }).fill("tester@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Fixture-password-123");
  await loginDialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByPlaceholder("https://...")).toHaveValue(source);
  await expect(page.getByText("Saved link fixture", { exact: true })).toBeVisible();
  expect(calls.analysis).toHaveLength(1);
  expect(calls.analysis[0].url).toBe(source);
  expect(calls.analysis[0].authorization).toMatch(/^Bearer /);
  const confirmAndDownload = page.getByRole("button", {
    name: /confirm rights and download|ยืนยันสิทธิ์และดาวน์โหลด/i,
  });
  await expect(confirmAndDownload).toBeVisible();
  await expect(confirmAndDownload).toBeEnabled();
  await expect(page.getByRole("checkbox", { name: /rights|สิทธิ์/i })).toHaveCount(0);
  expect(calls.jobs).toHaveLength(0);
  await confirmAndDownload.click();
  await expect.poll(() => calls.jobs.length).toBe(1);
  expect(calls.jobs[0].rights_confirmed).toBe(true);
  expect(calls.jobs[0].url).toBe(source);
  expect(calls.jobs[0].authorization).toMatch(/^Bearer /);
  await page.reload();
  expect(calls.jobs).toHaveLength(1);
});

test("keeps the pending link while changing to registration and signing in with Google", async ({
  page,
}) => {
  const calls = await mockMediaApi(page);
  await page.goto("/");
  await page.getByPlaceholder("https://...").fill(source);
  await page.getByPlaceholder("https://...").press("Enter");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("dialog", { name: "Sign in", exact: true })
  ).toBeVisible();
  await page.getByRole("link", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Your link is saved");
  expect(calls.analysis).toHaveLength(0);
  await page
    .getByRole("button", { name: /Continue with Google|Sign up with Google/ })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Saved link fixture", { exact: true })).toBeVisible();
  expect(calls.analysis).toHaveLength(1);
  expect(calls.analysis[0].url).toBe(source);
  expect(calls.jobs).toHaveLength(0);
});

test("keeps editing available when the browser cannot save the pending link", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "media_loader_requested_analysis_url")
        throw new DOMException("Storage unavailable", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page.goto("/");
  await page.getByPlaceholder("https://...").fill(source);
  await page.getByTestId("url-submit").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("alert").filter({ hasText: "could not remember" })
  ).toBeVisible();
  await expect(page.getByPlaceholder("https://...")).toHaveValue(source);
});
