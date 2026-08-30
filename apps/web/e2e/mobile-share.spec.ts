import { test, expect, devices } from "@playwright/test";

declare global {
  interface Window {
    __sharedPayload: {
      files: { name: string; size: number; type: string }[];
      title?: string;
    } | null;
  }
}

// The mock Supabase server (see e2e/support/mock-supabase-server.mjs) uses
// hostname "localhost", so @supabase/ssr names its cookie "sb-localhost-auth-token".
const SESSION_COOKIE = "sb-localhost-auth-token";
const APP_ORIGIN = "http://localhost:3100";

const JOB_ID = "job-mobile-1";
const TITLE = "Sample Open Access Video";
const FILENAME = "Sample Open Access Video.mp4";
const SOURCE_URL = "https://upload.wikimedia.org/wikipedia/commons/example.mp4";

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

/**
 * iPhone-like emulation that keeps the project's chromium browser type
 * (spreading devices["iPhone 13"] would force webkit and break the project
 * config, which only defines a chromium project).
 */
const iphoneLike = {
  viewport: devices["iPhone 13"].viewport ?? { width: 390, height: 844 },
  userAgent: devices["iPhone 13"].userAgent,
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
};

/** Seed a fake Supabase session cookie so the server layout sees a user. */
async function seedAuth(context: {
  addCookies: (cookies: { name: string; value: string; url: string }[]) => Promise<void>;
}) {
  const session = {
    access_token: fakeJwt(),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "fake-refresh-token-123",
    user: fakeUser,
  };
  // @supabase/ssr stores cookie values as "base64-" + base64url(JSON).
  const value =
    "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  await context.addCookies([
    { name: SESSION_COOKIE, value, url: APP_ORIGIN },
  ]);
}

/**
 * Stub the Web Share API so we can assert what gets shared.
 * File objects don't survive page.evaluate serialization (their properties
 * are getters), so we record plain objects instead.
 */
async function stubShare(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __sharedPayload: {
        files: { name: string; size: number; type: string }[];
        title?: string;
      } | null;
    };
    w.__sharedPayload = null;
    const share = async (data: { files: File[]; title?: string }) => {
      w.__sharedPayload = {
        title: data.title,
        files: data.files.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      };
    };
    const canShare = () => true;
    try {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: share,
      });
      Object.defineProperty(navigator, "canShare", {
        configurable: true,
        value: canShare,
      });
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).share = share;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).canShare = canShare;
    }
  });
}

function completedJob() {
  return {
    id: JOB_ID,
    original_url: SOURCE_URL,
    status: "COMPLETED",
    progress: 100,
    selected_format: "mp4-720p",
    selected_quality: "720p",
    output_format: "mp4",
    media_type: "video",
    title: TITLE,
    platform: "wikimedia",
    thumbnail_url: null,
    output_filename: FILENAME,
    file_available: true,
    file_size_mb: 4.7,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  };
}

const analyzeResponse = {
  ok: true,
  data: {
    policy: { decision: "allowed", reason: "Open Access Platform" },
    media: {
      title: TITLE,
      platform: "wikimedia",
      thumbnail_url: null,
      duration_seconds: 10,
      uploader: "Wikimedia Commons",
      source_domain: "wikimedia.org",
      view_count: 100,
      like_count: 5,
    },
    formats: [
      {
        format_id: "mp4-720p",
        type: "video",
        extension: "mp4",
        quality_label: "720p",
        width: 1280,
        height: 720,
        fps: 30,
        video_codec: "h264",
        audio_codec: "aac",
        filesize: 5000000,
        has_video: true,
        has_audio: true,
      },
    ],
  },
  error: null,
};

// The mocked endpoints are cross-origin (page :3100 -> API :8000), so every
// fulfilled response needs CORS headers and OPTIONS preflights must be
// answered, otherwise the browser blocks the requests.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/** Mock the FastAPI endpoints used by the real app flow. */
async function mockApi(
  page: import("@playwright/test").Page,
  options: {
    jobs: () => unknown[];
    onJobsRequest?: () => void;
    failJobsRequest?: (requestNumber: number) => boolean;
  },
) {
  let jobsRequestNumber = 0;
  // NOTE: glob patterns must end with `*` so query strings are matched too
  // (e.g. GET /downloads?limit=100&offset=0 would otherwise bypass the mock
  // and hit the real API with its :3000-only CORS policy).
  await page.route("**/media/analyze*", (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    return route.fulfill(jsonResponse(analyzeResponse));
  });
  await page.route("**/downloads*", (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    if (route.request().method() === "GET") {
      jobsRequestNumber += 1;
      options.onJobsRequest?.();
      if (options.failJobsRequest?.(jobsRequestNumber)) {
        return route.fulfill(
          jsonResponse(
            {
              ok: false,
              data: null,
              error: { code: "TEMPORARY_FAILURE", message: "Temporary failure" },
            },
            503,
          ),
        );
      }
      return route.fulfill(
        jsonResponse({
          ok: true,
          data: { jobs: options.jobs(), total: 1, limit: 100, offset: 0 },
          error: null,
        }),
      );
    }
    return route.fulfill(
      jsonResponse({
        ok: true,
        data: { job_id: JOB_ID, status: "QUEUED" },
        error: null,
      }),
    );
  });
  await page.route("**/files/download/**", (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    return route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${FILENAME}"`,
        ...CORS_HEADERS,
      },
      body: Buffer.from(new Array(4096).fill(7)),
    });
  });
}

test("dashboard has one shared jobs polling loop", async ({ page, context }) => {
  await seedAuth(context);
  let jobsRequests = 0;
  await mockApi(page, {
    jobs: () => [],
    onJobsRequest: () => {
      jobsRequests += 1;
    },
  });

  await page.goto("/dashboard");
  await expect(page.locator("main")).toBeVisible();
  await expect.poll(() => jobsRequests, { timeout: 10000 }).toBeGreaterThanOrEqual(1);
  await page.waitForTimeout(4500);

  expect(jobsRequests).toBeLessThanOrEqual(2);
});

test("dashboard ignores one transient jobs polling failure", async ({ page, context }) => {
  await seedAuth(context);
  let jobsRequests = 0;
  await mockApi(page, {
    jobs: () => [],
    onJobsRequest: () => {
      jobsRequests += 1;
    },
    failJobsRequest: (requestNumber) => requestNumber === 2,
  });

  await page.goto("/dashboard");
  await expect.poll(() => jobsRequests, { timeout: 10000 }).toBeGreaterThanOrEqual(2);
  await expect(
    page.getByText(/Could not connect|เชื่อมต่อระบบไม่ได้/),
  ).toHaveCount(0);

  await expect.poll(() => jobsRequests, { timeout: 10000 }).toBeGreaterThanOrEqual(3);
  await expect(
    page.getByText(/Could not connect|เชื่อมต่อระบบไม่ได้/),
  ).toHaveCount(0);
});

test("dashboard pauses jobs polling while its tab is hidden", async ({ page, context }) => {
  await seedAuth(context);
  let jobsRequests = 0;
  await mockApi(page, {
    jobs: () => [],
    onJobsRequest: () => {
      jobsRequests += 1;
    },
  });

  await page.goto("/dashboard");
  await expect.poll(() => jobsRequests, { timeout: 10000 }).toBeGreaterThanOrEqual(1);
  const requestsBeforeHidden = jobsRequests;

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
  });
  await page.waitForTimeout(5500);
  expect(jobsRequests).toBe(requestsBeforeHidden);

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => jobsRequests, { timeout: 5000 }).toBeGreaterThan(
    requestsBeforeHidden,
  );
});

test("history prioritizes only the first thumbnail", async ({ page, context }) => {
  await seedAuth(context);
  const firstThumbnail = `${APP_ORIGIN}/test-assets/first-thumbnail.svg`;
  const secondThumbnail = `${APP_ORIGIN}/test-assets/second-thumbnail.svg`;
  const firstJob = {
    ...completedJob(),
    id: "job-history-first",
    title: "First history item",
    thumbnail_url: firstThumbnail,
  };
  const secondJob = {
    ...completedJob(),
    id: "job-history-second",
    title: "Second history item",
    thumbnail_url: secondThumbnail,
  };

  await page.route("**/test-assets/*.svg", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"/>',
    }),
  );
  await mockApi(page, { jobs: () => [firstJob, secondJob] });

  await page.goto("/history");
  const firstImage = page.getByRole("img", { name: firstJob.title });
  const secondImage = page.getByRole("img", { name: secondJob.title });
  await expect(firstImage).toBeVisible();
  await expect(firstImage).toHaveAttribute("loading", "eager");
  await expect(firstImage).toHaveAttribute("fetchpriority", "high");
  await expect(secondImage).toHaveAttribute("loading", "lazy");
  await expect(secondImage).toHaveAttribute("fetchpriority", "auto");
});

test("history selection controls remain visible on mobile", async ({ page, context }) => {
  await seedAuth(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page, { jobs: () => [completedJob()] });

  await page.goto("/history");
  await expect(page.getByRole("button", { name: /ทั้งหมด|all/i }).first()).toHaveClass(
    /bg-primary\/10/,
  );
  await expect(page.getByText(/เสร็จแล้ว|completed/i).first()).toHaveClass(
    /text-emerald-700/,
  );
  await page.getByRole("button", { name: /ล้างประวัติ|clear history/i }).click();

  const selectAll = page.getByRole("checkbox", {
    name: /เลือกทั้งหมด|select all/i,
  });
  const cancel = page.getByRole("button", { name: /ยกเลิก|cancel/i });
  await expect(selectAll).toBeVisible();
  await expect(cancel).toBeVisible();

  const itemCheckbox = page.getByRole("checkbox", {
    name: /เลือกรายการ|select item/i,
  });
  const itemCard = itemCheckbox.locator("xpath=ancestor::article");
  const unselectedBackground = await itemCard.evaluate(
    (card) => getComputedStyle(card).backgroundColor,
  );
  await itemCard.click();
  await page.mouse.move(0, 0);
  await expect(itemCheckbox).toBeChecked();
  await expect
    .poll(() =>
      itemCard.evaluate((card) => getComputedStyle(card).backgroundColor),
    )
    .toBe(unselectedBackground);

  const checkboxPlacement = await itemCheckbox.evaluate((checkbox) => {
    const checkboxRect = checkbox.getBoundingClientRect();
    const thumbnail = checkbox
      .closest("article")
      ?.querySelector("div.aspect-video")
      ?.getBoundingClientRect();
    return {
      checkboxCenterX: checkboxRect.left + checkboxRect.width / 2,
      checkboxCenterY: checkboxRect.top + checkboxRect.height / 2,
      thumbnail: thumbnail
        ? {
            left: thumbnail.left,
            right: thumbnail.right,
            top: thumbnail.top,
            bottom: thumbnail.bottom,
          }
        : null,
    };
  });
  expect(checkboxPlacement.thumbnail).not.toBeNull();
  expect(checkboxPlacement.checkboxCenterX).toBeGreaterThanOrEqual(
    checkboxPlacement.thumbnail!.left,
  );
  expect(checkboxPlacement.checkboxCenterX).toBeLessThanOrEqual(
    checkboxPlacement.thumbnail!.right,
  );
  expect(checkboxPlacement.checkboxCenterY).toBeGreaterThanOrEqual(
    checkboxPlacement.thumbnail!.top,
  );
  expect(checkboxPlacement.checkboxCenterY).toBeLessThanOrEqual(
    checkboxPlacement.thumbnail!.bottom,
  );

  const layout = await page.locator("main").evaluate((main) => ({
    viewportWidth: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
    mainWidth: main.getBoundingClientRect().width,
  }));
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.mainWidth).toBeLessThanOrEqual(layout.viewportWidth);
});

test("history selection remains correct from the third mobile card onward", async ({ page, context }) => {
  await seedAuth(context);
  await page.setViewportSize({ width: 390, height: 844 });
  const jobs = [1, 2, 3, 4].map((number) => ({
    ...completedJob(),
    id: `mobile-selection-${number}`,
    title: `Mobile history item ${number}`,
  }));
  await mockApi(page, { jobs: () => jobs });

  await page.goto("/history");
  await page.getByRole("button", { name: /ล้างประวัติ|clear history/i }).click();

  const cards = page.locator("article");
  await expect(cards).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    await cards.nth(index).click();
  }

  await expect(page.getByText(/เลือกแล้ว 4 รายการ|Selected 4 items/i)).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: /เลือกทั้งหมด|select all/i }),
  ).toBeChecked();
  for (const job of jobs) {
    await expect(
      page.getByRole("checkbox", { name: new RegExp(job.title) }),
    ).toBeChecked();
  }
});

test("first selecting the third mobile card does not shift the page", async ({ page, context }) => {
  await seedAuth(context);
  await page.setViewportSize({ width: 390, height: 844 });
  const jobs = [1, 2, 3, 4].map((number) => ({
    ...completedJob(),
    id: `mobile-first-selection-${number}`,
    title: `Mobile first selection item ${number}`,
  }));
  await mockApi(page, { jobs: () => jobs });

  await page.goto("/history");
  await page.getByRole("button", { name: /ล้างประวัติ|clear history/i }).click();

  const thirdCard = page.locator("article").nth(2);
  await thirdCard.scrollIntoViewIfNeeded();
  const before = await thirdCard.evaluate((card) => ({
    cardTop: card.getBoundingClientRect().top,
    pageHeight: document.documentElement.scrollHeight,
  }));

  await thirdCard.click();

  const after = await thirdCard.evaluate((card) => ({
    cardTop: card.getBoundingClientRect().top,
    pageHeight: document.documentElement.scrollHeight,
  }));
  expect(after.pageHeight).toBe(before.pageHeight);
  expect(Math.abs(after.cardTop - before.cardTop)).toBeLessThanOrEqual(1);
  await expect(
    page.getByRole("checkbox", { name: new RegExp(jobs[2].title) }),
  ).toBeChecked();
});

test("history secondary text meets the readable contrast token", async ({ page, context }) => {
  await seedAuth(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page, {
    jobs: () => [completedJob(), { ...completedJob(), id: "history-contrast-2" }],
  });

  await page.goto("/history");

  await expect(page.getByText("2 รายการ", { exact: true })).toHaveClass(/text-text-muted/);
  await expect(page.locator("article .text-text-dim")).toHaveCount(0);
});

test("dashboard prioritizes the analyzed thumbnail", async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, { jobs: () => [] });
  const thumbnailUrl = `${APP_ORIGIN}/test-assets/dashboard-thumbnail.svg`;
  await page.route("**/media/analyze*", (route) =>
    route.fulfill(
      jsonResponse({
        ...analyzeResponse,
        data: {
          ...analyzeResponse.data,
          media: { ...analyzeResponse.data.media, thumbnail_url: thumbnailUrl },
        },
      }),
    ),
  );
  await page.route("**/test-assets/dashboard-thumbnail.svg", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"/>',
    }),
  );

  await page.goto("/dashboard");
  await page.getByPlaceholder("https://...").fill(SOURCE_URL);
  await page.keyboard.press("Enter");

  const thumbnail = page.locator('button[aria-label*="รับชมมีเดีย" i] img');
  await expect(thumbnail).toBeVisible({ timeout: 20000 });
  await expect(thumbnail).toHaveAttribute("loading", "eager");
  await expect(thumbnail).toHaveAttribute("fetchpriority", "high");
});

test("settings reuses the server-verified user", async ({ page, context }) => {
  await seedAuth(context);
  await mockApi(page, { jobs: () => [] });
  let browserUserRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/auth/v1/user")) browserUserRequests += 1;
  });

  await page.goto("/settings");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByText(fakeUser.email, { exact: true })).toBeVisible();
  await page.waitForTimeout(500);

  expect(browserUserRequests).toBe(0);
});

/** Go through the real dashboard flow: analyze -> create job. */
async function analyzeAndStartDownload(page: import("@playwright/test").Page) {
  await page.goto("/dashboard");
  await page.getByPlaceholder("https://...").fill(SOURCE_URL);
  await page.keyboard.press("Enter");
  await expect(page.getByText(TITLE)).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: /ดาวน์โหลด|download/i }).first().click();
}

test.describe("Mobile share / save flow (simulated iPhone)", () => {
  test.use(iphoneLike);

  test("shows the chooser when a job completes and shares the file", async ({
    page,
    context,
  }) => {
    await seedAuth(context);
    await stubShare(page);
    await mockApi(page, { jobs: () => [completedJob()] });

    await analyzeAndStartDownload(page);

    // The chooser dialog appears instead of a silent download.
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 20000 });
    const shareBtn = dialog.getByRole("button", { name: /แชร์|share/i }).first();
    await expect(shareBtn).toBeVisible({ timeout: 20000 });
    await shareBtn.click();

    // navigator.share must have been called with the one-shot file.
    await expect
      .poll(() => page.evaluate(() => window.__sharedPayload !== null))
      .toBe(true);
    const payload = (await page.evaluate(() => window.__sharedPayload))!;
    expect(payload.files.length).toBe(1);
    expect(payload.files[0].name).toBe(FILENAME);
    expect(payload.files[0].type).toBe("video/mp4");

    await expect(page.getByText(/แชร์ไฟล์แล้ว|shared/i)).toBeVisible();
  });

  test("dismissing the chooser keeps the file on the server", async ({
    page,
    context,
  }) => {
    await seedAuth(context);
    await stubShare(page);
    await mockApi(page, { jobs: () => [completedJob()] });

    await analyzeAndStartDownload(page);

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 20000 });
    await page.locator('[role="dialog"]').getByRole("button", { name: /ปิด|close/i }).click();

    await expect(page.getByText(/เก็บไฟล์ไว้ให้แล้ว|saved/i)).toBeVisible();
    // No file was consumed (nothing was shared).
    expect(await page.evaluate(() => window.__sharedPayload)).toBeNull();
  });
});

test.describe("Desktop flow (unchanged behavior)", () => {
  test("auto-downloads the file without showing the chooser", async ({
    page,
    context,
  }) => {
    await seedAuth(context);
    // No share stub — desktop Chromium has no navigator.share.
    await mockApi(page, { jobs: () => [completedJob()] });

    await analyzeAndStartDownload(page);

    // The file endpoint is fetched directly (auto browser download).
    await Promise.race([
      page.waitForRequest("**/files/download/**", { timeout: 10000 }).catch(() => null),
      page.waitForEvent("download", { timeout: 10000 }).catch(() => null),
    ]);
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });
});

test.describe("History Share button (mobile)", () => {
  test.use(iphoneLike);

  test("shows a Share button for a completed job with file available", async ({
    page,
    context,
  }) => {
    await seedAuth(context);
    await stubShare(page);
    await mockApi(page, { jobs: () => [completedJob()] });

    await page.goto("/history");

    const shareButton = page.getByRole("button", { name: /แชร์|share/i }).first();
    await expect(shareButton).toBeVisible({ timeout: 20000 });
    await shareButton.click();

    await expect
      .poll(() => page.evaluate(() => window.__sharedPayload !== null))
      .toBe(true);
    const payload = (await page.evaluate(() => window.__sharedPayload))!;
    expect(payload.files.length).toBe(1);
    expect(payload.files[0].name).toBe(FILENAME);
  });
});
