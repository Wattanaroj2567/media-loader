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

  test("should explain history connection errors and show automatic retry status", async ({
    page,
    context,
  }) => {
    await seedAuth(context);

    let requestCount = 0;
    let markBackgroundRetryStarted: () => void = () => {};
    let releaseBackgroundRetry: () => void = () => {};
    const backgroundRetryStarted = new Promise<void>((resolve) => {
      markBackgroundRetryStarted = resolve;
    });
    const backgroundRetryResponse = new Promise<void>((resolve) => {
      releaseBackgroundRetry = resolve;
    });

    await page.route("**/downloads*", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: CORS_HEADERS });
        return;
      }

      requestCount += 1;
      if (requestCount === 1) {
        await route.fulfill({
          status: 503,
          headers: CORS_HEADERS,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            error: { message: "Service unavailable" },
          }),
        });
        return;
      }

      markBackgroundRetryStarted();
      await backgroundRetryResponse;
      await route.fulfill({
        status: 200,
        headers: CORS_HEADERS,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { jobs: [], total: 0 },
          error: null,
        }),
      });
    });

    await page.goto("/history");
    await expect(
      page.getByText(/โหลดประวัติไม่สำเร็จ|Couldn't load history/i)
    ).toBeVisible();
    await expect(
      page.getByText(/ประวัติของคุณไม่ได้ถูกลบ|history hasn't been deleted/i)
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /ลองอีกครั้ง|Retry/i })).toHaveCount(
      0
    );

    await page.evaluate(() => {
      window.dispatchEvent(new Event("media-loader:jobs-changed"));
    });
    await backgroundRetryStarted;
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: /กำลังลองเชื่อมต่อใหม่|Trying to reconnect/i })
    ).toBeVisible();
    await expect(
      page.getByText(/ยังไม่มีประวัติการดาวน์โหลด|No download history yet\./i)
    ).toHaveCount(0);

    releaseBackgroundRetry();
    await expect(
      page.getByText(/ยังไม่มีประวัติการดาวน์โหลด|No download history yet\./i)
    ).toBeVisible();
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
      file_size_bytes: index === 0 ? 1_447_035 : null,
      file_size_mb: index === 0 ? 1.4 : 10.5,
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
    await expect(cards.first()).toContainText("1.38 MB");
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

  test("should filter history by every supported platform", async ({
    page,
    context,
  }) => {
    await seedAuth(context);

    const platforms = [
      { id: "youtube", label: "YouTube", platform: "Youtube", domain: "youtube.com" },
      { id: "tiktok", label: "TikTok", platform: "TikTok", domain: "tiktok.com" },
      {
        id: "facebook",
        label: "Facebook",
        platform: "Facebook",
        domain: "facebook.com",
      },
      {
        id: "instagram",
        label: "Instagram",
        platform: "Instagram",
        domain: "instagram.com",
      },
      { id: "x", label: "X", platform: "X", domain: "x.com" },
      {
        id: "bilibili",
        label: "Bilibili",
        platform: "Bilibili",
        domain: "bilibili.com",
      },
      { id: "vk video", label: "VK Video", platform: "VK Video", domain: "vkvideo.ru" },
      { id: "giphy", label: "Giphy", platform: "Giphy", domain: "giphy.com" },
      { id: "tenor", label: "Tenor", platform: "Tenor", domain: "tenor.com" },
    ];
    const now = new Date().toISOString();
    const jobs = platforms.map((item) => ({
      id: `job-${item.id.replaceAll(" ", "-")}`,
      original_url: `https://${item.domain}/item`,
      status: "COMPLETED",
      progress: 100,
      selected_format: "720p",
      output_format: item.id === "giphy" || item.id === "tenor" ? "gif" : "mp4",
      title: `${item.label} history item`,
      platform: item.platform,
      source_domain: item.domain,
      file_available: false,
      created_at: now,
      updated_at: now,
      completed_at: now,
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

    for (const platform of platforms) {
      const filterButton = page.getByRole("button", {
        name: platform.label,
        exact: true,
      });
      await expect(filterButton).toBeVisible();
      await filterButton.click();
      const cards = page.locator("article");
      await expect(cards).toHaveCount(1);
      await expect(cards.first()).toContainText(`${platform.label} history item`);
    }
  });

  test("should preserve reusable links and hide actions for redacted legacy links", async ({
    page,
    context,
  }) => {
    await seedAuth(context);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const sourceUrl = "https://www.tiktok.com/@creator/video/1234567890?source=history";
    const now = new Date().toISOString();
    const jobs = [
      {
        id: "job-with-source-url",
        original_url: sourceUrl,
        status: "COMPLETED",
        progress: 100,
        selected_format: "mp4-720p",
        output_format: "mp4",
        media_type: "video",
        title: "Reusable TikTok source",
        platform: "tiktok",
        source_domain: "www.tiktok.com",
        file_available: false,
        created_at: now,
        updated_at: now,
        completed_at: now,
      },
      {
        id: "job-with-redacted-source-url",
        original_url: "https://www.tiktok.com/[redacted]",
        status: "COMPLETED",
        progress: 100,
        selected_format: "mp4-720p",
        output_format: "mp4",
        media_type: "video",
        title: "Older TikTok source",
        platform: "tiktok",
        source_domain: "www.tiktok.com",
        file_available: false,
        created_at: now,
        updated_at: now,
        completed_at: now,
      },
    ];

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
    await page.route("**/media/analyze*", (route) => {
      if (route.request().method() === "OPTIONS") {
        return route.fulfill({ status: 204, headers: CORS_HEADERS });
      }
      return route.fulfill({
        status: 400,
        headers: CORS_HEADERS,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          data: null,
          error: { message: "Test analysis stopped" },
        }),
      });
    });

    await page.goto("/history");

    const reusableCard = page.locator("article").filter({
      hasText: "Reusable TikTok source",
    });
    const copyButton = reusableCard.getByRole("button", {
      name: /คัดลอกลิงก์|copy link/i,
    });
    await expect(copyButton).toBeVisible();
    await copyButton.click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(sourceUrl);

    const legacyCard = page.locator("article").filter({
      hasText: "Older TikTok source",
    });
    await expect(
      legacyCard.getByText(/ลิงก์เดิมถูกลบ|original link was removed/i)
    ).toHaveCount(0);
    await expect(
      legacyCard.getByRole("button", { name: /คัดลอกลิงก์|copy link/i })
    ).toHaveCount(0);
    await expect(
      legacyCard.getByRole("button", {
        name: /วิเคราะห์ลิงก์เดิม|analyze original link/i,
      })
    ).toHaveCount(0);

    const analysisRequest = page.waitForRequest(
      (request) =>
        request.url().includes("/media/analyze") && request.method() === "POST"
    );
    await reusableCard
      .getByRole("button", { name: /วิเคราะห์ลิงก์เดิม|analyze original link/i })
      .click();
    expect((await analysisRequest).postDataJSON().url).toBe(sourceUrl);
  });
});
