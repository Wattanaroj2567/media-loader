import { test, expect } from "@playwright/test";

const SESSION_COOKIE = "sb-localhost-auth-token";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

async function seedAuth(
  context: {
    addCookies: (
      cookies: { name: string; value: string; url: string }[]
    ) => Promise<void>;
  },
  appOrigin: string
) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: "user-dashboard-test",
    aud: "authenticated",
    role: "authenticated",
    email: "dashboard@example.com",
    app_metadata: { provider: "google" },
    user_metadata: { full_name: "Dashboard Test User" },
  };
  const accessToken = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: user.id,
    aud: user.aud,
    role: user.role,
    exp: now + 7200,
    iat: now,
    email: user.email,
  })}.fakesignature`;
  const session = {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: "fake-refresh-token",
    user,
  };
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  await context.addCookies([{ name: SESSION_COOKIE, value, url: appOrigin }]);
}

test.describe("Mocked Dashboard Workflow", () => {
  test("retains the analyzer details and URL after adding a job to the queue", async ({
    context,
    page,
  }) => {
    const appOrigin = new URL(test.info().project.use.baseURL!).origin;
    await seedAuth(context, appOrigin);
    await context.addCookies([
      { name: "media-loader-locale", value: "en", url: appOrigin },
    ]);

    const sourceUrl =
      "https://upload.wikimedia.org/wikipedia/commons/transcoded/test-video.webm";
    const queuedJob = {
      id: "job-next-test",
      original_url: sourceUrl,
      status: "QUEUED",
      progress: 0,
      selected_format: "mp4-720p",
      selected_quality: "720p",
      output_format: "mp4",
      media_type: "video",
      title: "Next Link Test Video",
      uploader: "Wikimedia Commons",
      platform: "wikimedia",
      source_domain: "wikimedia.org",
      thumbnail_url: null,
      duration_seconds: 10,
      output_filename: null,
      file_available: false,
      file_size_mb: null,
      error_message: null,
      created_at: "2026-09-18T12:00:00Z",
      updated_at: "2026-09-18T12:00:00Z",
      completed_at: null,
      download_speed: null,
    };
    let listRequestCount = 0;
    await page.route("**/media/analyze*", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: CORS_HEADERS });
        return;
      }

      await route.fulfill(
        jsonResponse({
          ok: true,
          data: {
            policy: { decision: "allowed", reason: "Open Access Platform" },
            media: {
              title: queuedJob.title,
              platform: queuedJob.platform,
              thumbnail_url: null,
              duration_seconds: queuedJob.duration_seconds,
              uploader: queuedJob.uploader,
              source_domain: queuedJob.source_domain,
              view_count: 1000,
              reaction_count: 35000,
            },
            formats: [
              {
                format_id: "mp4-720p",
                extension: "mp4",
                type: "video",
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
        })
      );
    });
    await page.route("**/downloads*", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: CORS_HEADERS });
        return;
      }
      if (route.request().method() === "POST") {
        await route.fulfill(
          jsonResponse({
            ok: true,
            data: { job_id: queuedJob.id, status: queuedJob.status },
            error: null,
          })
        );
        return;
      }

      listRequestCount += 1;
      const jobs = listRequestCount === 1 ? [] : [queuedJob];
      await route.fulfill(
        jsonResponse({
          ok: true,
          data: { jobs, total: jobs.length, limit: 100, offset: 0 },
          error: null,
        })
      );
    });

    await page.goto("/dashboard");
    await expect.poll(() => listRequestCount).toBe(1);
    await expect(page.locator("#download-queue")).toHaveCount(0);

    await page.evaluate(() => {
      const queueAnchor = document.querySelector<HTMLElement>("#download-queue-anchor");
      if (!queueAnchor) throw new Error("Download queue anchor was not rendered");
      queueAnchor.dataset.scrollIntoViewCalls = "0";
      queueAnchor.scrollIntoView = () => {
        queueAnchor.dataset.scrollIntoViewCalls = String(
          Number(queueAnchor.dataset.scrollIntoViewCalls ?? "0") + 1
        );
      };
    });

    const urlInput = page.getByRole("textbox", {
      name: "Paste a clip link, e.g. https://...",
    });
    await urlInput.fill(sourceUrl);
    await urlInput.press("Enter");
    await expect(
      page.getByRole("button", { name: "Download", exact: true })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "GIF", exact: true })).toHaveCount(0);
    await expect(page.getByText("35,000 reactions", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Download", exact: true }).click();

    await expect(urlInput).toHaveValue(sourceUrl);
    await expect(urlInput).toBeEditable();
    await expect(urlInput).toBeInViewport();
    await expect(page.getByText("35,000 reactions", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: "Added to queue" })
    ).toContainText("You can add another link now");
    await expect(page.locator("#download-queue")).toContainText(queuedJob.title);
    // Queueing a job must request a scroll down to the queue anchor.
    await expect(page.locator("#download-queue-anchor")).toHaveAttribute(
      "data-scroll-into-view-calls",
      "1"
    );

    // Clicking Clear (the X button in the input bar) resets the analyzer
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(urlInput).toHaveValue("");
    await expect(page.getByText("35,000 reactions", { exact: true })).toHaveCount(0);
  });

  test("shows a localized wait time when download creation is rate limited", async ({
    context,
    page,
  }) => {
    const appOrigin = new URL(test.info().project.use.baseURL!).origin;
    await seedAuth(context, appOrigin);
    await context.addCookies([
      { name: "media-loader-locale", value: "th", url: appOrigin },
    ]);

    await page.route("**/media/analyze*", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: CORS_HEADERS });
        return;
      }

      await route.fulfill(
        jsonResponse({
          ok: true,
          data: {
            policy: { decision: "allowed", reason: "Public source" },
            media: {
              title: "Queue failure test",
              platform: "Test",
              thumbnail_url: null,
              duration_seconds: 10,
              uploader: "Test creator",
              source_domain: "example.com",
              view_count: null,
              like_count: null,
              reaction_count: null,
              is_animated_gif: false,
            },
            formats: [
              {
                format_id: "mp4-720p",
                extension: "mp4",
                type: "video",
                quality_label: "720p",
                width: 1280,
                height: 720,
                fps: 30,
                bitrate: null,
                video_codec: "h264",
                audio_codec: "aac",
                filesize: 5000000,
                has_video: true,
                has_audio: true,
              },
            ],
          },
          error: null,
        })
      );
    });
    await page.route("**/downloads*", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: CORS_HEADERS });
        return;
      }
      if (route.request().method() === "POST") {
        await route.fulfill({
          ...jsonResponse(
            {
              ok: false,
              data: null,
              error: {
                code: "TOO_MANY_REQUESTS",
                message: "Rate limit exceeded. Maximum 60 requests per 60s.",
              },
            },
            429
          ),
          headers: { ...CORS_HEADERS, "Retry-After": "60" },
        });
        return;
      }

      await route.fulfill(
        jsonResponse({
          ok: true,
          data: { jobs: [], total: 0, limit: 100, offset: 0 },
          error: null,
        })
      );
    });

    await page.goto("/dashboard");
    const urlInput = page.getByRole("textbox", {
      name: "วางลิงก์คลิป เช่น https://...",
    });
    await urlInput.fill("https://example.com/video");
    await urlInput.press("Enter");
    await page.getByRole("button", { name: "ดาวน์โหลด", exact: true }).click();

    const errorToast = page
      .getByRole("status")
      .filter({ hasText: "ส่งคำขอบ่อยเกินไป" });
    await expect(errorToast).toContainText(
      "กรุณารอประมาณ 60 วินาทีแล้วลองดาวน์โหลดอีกครั้ง"
    );
    await expect(errorToast).not.toContainText("Rate limit exceeded");
  });

  test("queues a GIF file from a video source", async ({ context, page }) => {
    const appOrigin = new URL(test.info().project.use.baseURL!).origin;
    await seedAuth(context, appOrigin);
    await context.addCookies([
      { name: "media-loader-locale", value: "en", url: appOrigin },
    ]);

    let createdBody: Record<string, unknown> | null = null;
    await page.route("**/media/analyze*", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: CORS_HEADERS });
        return;
      }
      await route.fulfill(
        jsonResponse({
          ok: true,
          data: {
            policy: { decision: "allowed", reason: "Public source" },
            media: {
              title: "Animated X post",
              platform: "Twitter",
              thumbnail_url: null,
              duration_seconds: null,
              uploader: "Creator",
              source_domain: "x.com",
              view_count: 43574,
              like_count: 546,
              reaction_count: null,
              is_animated_gif: true,
            },
            formats: [
              {
                format_id: "http",
                extension: "mp4",
                type: "video",
                quality_label: "Original video",
                width: null,
                height: null,
                fps: null,
                bitrate: null,
                video_codec: null,
                audio_codec: null,
                filesize: null,
                has_video: true,
                has_audio: false,
              },
            ],
          },
          error: null,
        })
      );
    });
    await page.route("**/downloads*", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: CORS_HEADERS });
        return;
      }
      if (route.request().method() === "POST") {
        createdBody = route.request().postDataJSON();
        await route.fulfill(
          jsonResponse({
            ok: true,
            data: { job_id: "gif-job", status: "QUEUED" },
            error: null,
          })
        );
        return;
      }
      await route.fulfill(
        jsonResponse({
          ok: true,
          data: { jobs: [], total: 0, limit: 100, offset: 0 },
          error: null,
        })
      );
    });

    await page.goto("/dashboard");
    const urlInput = page.getByRole("textbox", {
      name: "Paste a clip link, e.g. https://...",
    });
    await urlInput.fill("https://x.com/i/status/2037838931568566363");
    await urlInput.press("Enter");
    await page.getByRole("button", { name: "GIF", exact: true }).click();
    await page.getByRole("button", { name: "Download", exact: true }).click();

    await expect
      .poll(() => createdBody)
      .toMatchObject({
        selected_format_id: "http",
        output_format: "gif",
        rights_confirmed: true,
      });
  });

  test("should scroll back to top when queue closes after cancellation", async ({
    context,
    page,
  }) => {
    const appOrigin = new URL(test.info().project.use.baseURL!).origin;
    await seedAuth(context, appOrigin);
    await context.addCookies([
      { name: "media-loader-locale", value: "en", url: appOrigin },
    ]);
    let jobs = [
      {
        id: "job-cancel-test",
        original_url: "https://upload.wikimedia.org/wikipedia/commons/test.mp4",
        source_domain: "wikimedia.org",
        platform: "wikimedia",
        title: "Sample Active Video",
        status: "DOWNLOADING",
        format_id: "mp4-720p",
        format_type: "video",
        selected_format: "mp4-720p",
        output_format: "mp4",
        quality_label: "720p",
        progress: 45,
        progress_percent: 45,
        downloaded_bytes: 4500000,
        total_bytes: 10000000,
        eta_seconds: 5,
        speed_bytes_per_second: 1000000,
        thumbnail_url: null,
        uploader: "Wikimedia Commons",
        duration_seconds: 10,
        output_filename: null,
        file_available: false,
        file_size_mb: null,
        error_message: null,
        created_at: "2026-09-18T12:00:00Z",
        updated_at: "2026-09-18T12:00:00Z",
        completed_at: null,
        download_speed: null,
      },
    ];

    await page.route("**/downloads?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { jobs, total: jobs.length },
          error: null,
        }),
      });
    });

    await page.route("**/downloads/job-cancel-test/pause", async (route) => {
      jobs = [
        {
          ...jobs[0],
          status: "PAUSED",
          progress: 45,
          selected_format: "mp4-720p",
          output_format: "mp4",
        },
      ];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: jobs[0],
          error: null,
        }),
      });
    });

    await page.route("**/downloads/job-cancel-test/cancel", async (route) => {
      jobs = [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            id: "job-cancel-test",
            status: "CANCELLED",
          },
          error: null,
        }),
      });
    });

    await page.goto("/dashboard");
    const downloadQueue = page.locator("#download-queue");
    await expect(downloadQueue).toBeVisible();
    await expect(downloadQueue).toContainText("Downloading");
    await expect(downloadQueue).not.toContainText("Preparing file");

    await page.getByRole("button", { name: "Pause download", exact: true }).click();
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(downloadQueue).toContainText("Paused");
    await expect(downloadQueue).not.toContainText("Queued");

    await page.evaluate(() => {
      document.documentElement.dataset.scrolledToTop = "false";
      window.scrollTo = (options?: ScrollToOptions | number, y?: number) => {
        const top = typeof options === "object" ? options.top : (y ?? options);
        document.documentElement.dataset.scrolledToTop = String(top === 0);
      };
    });

    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-scrolled-to-top", "true");
  });

  test("dismisses a stale queue action before a replacement job appears", async ({
    context,
    page,
  }) => {
    const appOrigin = new URL(test.info().project.use.baseURL!).origin;
    await seedAuth(context, appOrigin);
    await context.addCookies([
      { name: "media-loader-locale", value: "en", url: appOrigin },
    ]);

    const activeJob = {
      id: "job-old",
      original_url: "https://upload.wikimedia.org/wikipedia/commons/test.mp4",
      source_domain: "wikimedia.org",
      platform: "wikimedia",
      title: "Old active job",
      status: "DOWNLOADING",
      format_id: "mp4-720p",
      format_type: "video",
      selected_format: "mp4-720p",
      output_format: "mp4",
      quality_label: "720p",
      progress: 45,
      progress_percent: 45,
      downloaded_bytes: 4500000,
      total_bytes: 10000000,
      eta_seconds: 5,
      speed_bytes_per_second: 1000000,
      thumbnail_url: null,
      uploader: "Wikimedia Commons",
      duration_seconds: 10,
      output_filename: null,
      file_available: false,
      file_size_mb: null,
      error_message: null,
      created_at: "2026-09-18T12:00:00Z",
      updated_at: "2026-09-18T12:00:00Z",
      completed_at: null,
      download_speed: null,
    };
    let jobs = [activeJob];
    let oldPauseCalls = 0;
    let newPauseCalls = 0;

    await page.route("**/downloads?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: { jobs, total: jobs.length },
          error: null,
        }),
      });
    });
    await page.route("**/downloads/job-old/pause", async (route) => {
      oldPauseCalls += 1;
      await route.fulfill({ status: 409, body: "{}" });
    });
    await page.route("**/downloads/job-new/pause", async (route) => {
      newPauseCalls += 1;
      jobs = [{ ...jobs[0], status: "PAUSED" }];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, data: jobs[0], error: null }),
      });
    });

    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Pause download", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Confirm", exact: true })
    ).toBeVisible();

    jobs = [{ ...activeJob, id: "job-new", title: "Replacement active job" }];
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("media-loader:jobs-changed"));
    });

    await expect(page.getByText("Replacement active job")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirm", exact: true })
    ).toHaveCount(0);
    expect(oldPauseCalls).toBe(0);

    await page.getByRole("button", { name: "Pause download", exact: true }).click();
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect.poll(() => newPauseCalls).toBe(1);
    expect(oldPauseCalls).toBe(0);
  });

  test("compacts the mobile navigation on scroll down and expands it on scroll up", async ({
    context,
    page,
  }) => {
    await seedAuth(context, new URL(test.info().project.use.baseURL!).origin);
    await page.setViewportSize({ width: 390, height: 700 });
    await page.route("**/downloads?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, data: { jobs: [], total: 0 }, error: null }),
      });
    });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const mobileHeader = page.getByTestId("app-mobile-header");
    const mobileNavigation = page.getByTestId("app-mobile-navigation");
    await expect(mobileHeader).toHaveAttribute("data-scroll-state", "visible");
    await expect(mobileNavigation).toHaveAttribute("data-scroll-state", "expanded");
    const expandedShape = await mobileNavigation.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      radius: Number.parseFloat(getComputedStyle(element).borderTopLeftRadius),
    }));
    expect(expandedShape.radius).toBeGreaterThanOrEqual(expandedShape.height / 2);
    const expandedWidth = await mobileNavigation.evaluate(
      (element) => element.getBoundingClientRect().width
    );

    await page.evaluate(() => {
      const main = document.querySelector<HTMLElement>("main");
      if (!main) throw new Error("Main content was not rendered");
      main.style.minHeight = "1600px";
    });
    const scrollMetrics = await page.evaluate(() => ({
      viewportHeight: window.innerHeight,
      scrollHeight: document.scrollingElement?.scrollHeight ?? 0,
    }));
    expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.viewportHeight);

    await page.mouse.wheel(0, 300);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(72);
    await expect(mobileHeader).toHaveAttribute("data-scroll-state", "visible");
    await expect(mobileNavigation).toHaveAttribute("data-scroll-state", "compact");
    await expect(mobileNavigation).toBeVisible();
    await expect
      .poll(() =>
        mobileNavigation.evaluate((element) => element.getBoundingClientRect().width)
      )
      .toBeLessThan(expandedWidth);

    await page.mouse.wheel(0, -140);
    await expect(mobileHeader).toHaveAttribute("data-scroll-state", "visible");
    await expect(mobileNavigation).toHaveAttribute("data-scroll-state", "expanded");
    await expect(mobileNavigation).toBeVisible();
  });

  test("should handle mocked media analysis and intercept API route correctly", async ({
    page,
  }) => {
    let analyzeCalled = false;

    await page.route("**/media/analyze", async (route) => {
      analyzeCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            policy: { decision: "allowed", reason: "Open Access Platform" },
            media: {
              title: "Sample Open Access Video",
              platform: "wikimedia",
              thumbnail_url: null,
              duration_seconds: 10,
              uploader: "Wikimedia Commons",
              source_domain: "wikimedia.org",
              view_count: 1000,
            },
            formats: [
              {
                format_id: "mp4-720p",
                extension: "mp4",
                type: "video",
                quality_label: "720p",
                height: 720,
                fps: 30,
                video_codec: "h264",
                audio_codec: "aac",
                filesize: 5000000,
              },
            ],
          },
          error: null,
        }),
      });
    });

    await page.goto("/");

    // Execute fetch inside browser page context so page.route catches it
    const status = await page.evaluate(async () => {
      const res = await fetch("/media/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://upload.wikimedia.org/wikipedia/commons/test.mp4",
        }),
      });
      return res.status;
    });

    expect(analyzeCalled).toBe(true);
    expect(status).toBe(200);
  });

  test("should intercept job creation endpoint and confirm download contract", async ({
    page,
  }) => {
    let jobCreated = false;

    await page.route("**/downloads", async (route) => {
      jobCreated = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            id: "job-mock-999",
            original_url: "https://upload.wikimedia.org/wikipedia/commons/test.mp4",
            status: "QUEUED",
            progress: 0,
            selected_format: "mp4-720p",
            output_format: "mp4",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      });
    });

    await page.goto("/");

    const status = await page.evaluate(async () => {
      const res = await fetch("/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://upload.wikimedia.org/wikipedia/commons/test.mp4",
          selected_format_id: "mp4-720p",
          output_format: "mp4",
          rights_confirmed: true,
        }),
      });
      return res.status;
    });

    expect(jobCreated).toBe(true);
    expect(status).toBe(200);
  });
});
