import { test, expect } from "@playwright/test";

const SESSION_COOKIE = "sb-localhost-auth-token";
const APP_ORIGIN = "http://localhost:3100";

const fakeUser = {
  id: "user-test-1",
  aud: "authenticated",
  role: "authenticated",
  email: "tester@example.com",
  app_metadata: { provider: "google" },
  user_metadata: { full_name: "Test User" },
};

function fakeJwt() {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: fakeUser.id,
    aud: "authenticated",
    role: "authenticated",
    exp: now + 7200,
    iat: now,
    email: fakeUser.email,
  })}.fakesignature`;
}

async function seedAuth(context: {
  addCookies: (
    cookies: { name: string; value: string; url: string }[]
  ) => Promise<void>;
}) {
  const session = {
    access_token: fakeJwt(),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "fake-refresh-token-123",
    user: fakeUser,
  };
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  await context.addCookies([{ name: SESSION_COOKIE, value, url: APP_ORIGIN }]);
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

test.describe("History Page UI", () => {
  test("should render history page and empty state container", async ({ page }) => {
    await page.goto("/history");

    await expect(page.locator("main")).toBeVisible();

    // Check main heading or header
    const mainHeading = page.locator("h1, h2, header").first();
    await expect(mainHeading).toBeVisible();
  });

  test("should paginate history list when items exceed 10", async ({
    page,
    context,
  }) => {
    await seedAuth(context);

    // Create 21 completed jobs matching user's scenario
    const jobs = Array.from({ length: 21 }, (_, index) => ({
      id: `job-history-${index + 1}`,
      original_url: `https://example.com/video-${index + 1}`,
      status: "COMPLETED",
      progress: 100,
      selected_format: "mp4-720p",
      selected_quality: "720p",
      output_format: "mp4",
      media_type: "video",
      title: `Completed video item ${index + 1}`,
      platform: "youtube",
      thumbnail_url: null,
      output_filename: `video-${index + 1}.mp4`,
      file_available: true,
      file_size_mb: 10.5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    }));

    await page.route("**/downloads*", (route) => {
      if (route.request().method() === "OPTIONS") {
        return route.fulfill({ status: 204, headers: CORS_HEADERS });
      }
      return route.fulfill({
        status: 200,
        headers: CORS_HEADERS,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { jobs, total: jobs.length },
          error: null,
        }),
      });
    });

    await page.goto("/history");

    // Total count visible in header
    await expect(page.getByText(/^(21 items|21 รายการ)$/)).toBeVisible();

    // Page 1 should show exactly 10 cards
    const cards = page.locator("article");
    await expect(cards).toHaveCount(10);
    await expect(cards.first()).toContainText("Completed video item 1");
    await expect(cards.last()).toContainText("Completed video item 10");

    // Pagination navigation should be visible
    const pagination = page.getByRole("navigation", {
      name: /การแบ่งหน้า|pagination/i,
    });
    await expect(pagination).toBeVisible();

    // Page 2 button click
    const page2Button = pagination.getByRole("button", { name: /^(หน้า 2|Page 2|2)$/ });
    await page2Button.click();

    // Page 2 should display items 11-20
    await expect(cards).toHaveCount(10);
    await expect(cards.first()).toContainText("Completed video item 11");
    await expect(cards.last()).toContainText("Completed video item 20");

    // Page 3 button click
    const page3Button = pagination.getByRole("button", { name: /^(หน้า 3|Page 3|3)$/ });
    await page3Button.click();

    // Page 3 should display item 21
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("Completed video item 21");

    // Previous button click should take us back to page 2
    const prevButton = pagination.getByRole("button", { name: /ก่อนหน้า|previous/i });
    await prevButton.click();
    await expect(cards).toHaveCount(10);
    await expect(cards.first()).toContainText("Completed video item 11");
  });
});
