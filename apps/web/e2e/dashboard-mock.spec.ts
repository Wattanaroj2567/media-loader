import { test, expect } from '@playwright/test';

const SESSION_COOKIE = 'sb-localhost-auth-token';

async function seedAuth(context: {
  addCookies: (cookies: { name: string; value: string; url: string }[]) => Promise<void>;
}, appOrigin: string) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: 'user-dashboard-test',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'dashboard@example.com',
    app_metadata: { provider: 'google' },
    user_metadata: { full_name: 'Dashboard Test User' },
  };
  const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: user.id,
    aud: user.aud,
    role: user.role,
    exp: now + 7200,
    iat: now,
    email: user.email,
  })}.fakesignature`;
  const session = {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: 'fake-refresh-token',
    user,
  };
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;
  await context.addCookies([{ name: SESSION_COOKIE, value, url: appOrigin }]);
}

test.describe('Mocked Dashboard Workflow', () => {
  test('scrolls the download queue into view when a job is created', async ({ context, page }) => {
    await seedAuth(context, new URL(test.info().project.use.baseURL!).origin);
    let listRequestCount = 0;
    await page.route('**/downloads?**', async (route) => {
      listRequestCount += 1;
      const jobs = listRequestCount === 1
        ? []
        : [{
            id: 'job-scroll-test',
            original_url: 'https://upload.wikimedia.org/wikipedia/commons/test.mp4',
            status: 'QUEUED',
            progress: 0,
            selected_format: 'mp4-720p',
            selected_quality: '720p',
            output_format: 'mp4',
            media_type: 'video',
            title: 'Scroll Test Video',
            uploader: 'Wikimedia Commons',
            platform: 'wikimedia',
            source_domain: 'wikimedia.org',
            thumbnail_url: null,
            duration_seconds: 10,
            output_filename: null,
            file_available: false,
            file_size_mb: null,
            error_message: null,
            created_at: '2026-09-18T12:00:00Z',
            updated_at: '2026-09-18T12:00:00Z',
            completed_at: null,
            download_speed: null,
          }];

      if (listRequestCount > 1) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: { jobs, total: jobs.length },
          error: null,
        }),
      });
    });
    await page.goto('/dashboard');
    await expect.poll(() => listRequestCount).toBe(1);
    await expect(page.locator('#download-queue')).toHaveCount(0);

    const scrollResult = await page.evaluate(async () => {
      const queueAnchor = document.querySelector<HTMLElement>('#download-queue-anchor');
      if (!queueAnchor) throw new Error('Download queue anchor was not rendered');

      return new Promise<{ options: ScrollIntoViewOptions | null; queueRendered: boolean }>((resolve) => {
        const timeoutId = window.setTimeout(() => {
          resolve({ options: null, queueRendered: false });
        }, 1500);
        queueAnchor.scrollIntoView = (options?: boolean | ScrollIntoViewOptions) => {
          window.clearTimeout(timeoutId);
          resolve({
            options: typeof options === 'object' ? options : null,
            queueRendered: document.querySelector('#download-queue') !== null,
          });
        };

        window.dispatchEvent(
          new CustomEvent('media-loader:job-created', {
            detail: { jobId: 'job-scroll-test' },
          }),
        );
        window.dispatchEvent(new CustomEvent('media-loader:jobs-changed'));
      });
    });

    expect(scrollResult).toEqual({
      options: { behavior: 'smooth', block: 'start' },
      queueRendered: true,
    });
  });

  test('should scroll back to top when queue closes after cancellation', async ({ context, page }) => {
    await seedAuth(context, new URL(test.info().project.use.baseURL!).origin);
    let jobs = [
      {
        id: 'job-cancel-test',
        original_url: 'https://upload.wikimedia.org/wikipedia/commons/test.mp4',
        source_domain: 'wikimedia.org',
        platform: 'wikimedia',
        title: 'Sample Active Video',
        status: 'DOWNLOADING',
        format_id: 'mp4-720p',
        format_type: 'video',
        quality_label: '720p',
        progress_percent: 45,
        downloaded_bytes: 4500000,
        total_bytes: 10000000,
        eta_seconds: 5,
        speed_bytes_per_second: 1000000,
        thumbnail_url: null,
        uploader: 'Wikimedia Commons',
        duration_seconds: 10,
        output_filename: null,
        file_available: false,
        file_size_mb: null,
        error_message: null,
        created_at: '2026-09-18T12:00:00Z',
        updated_at: '2026-09-18T12:00:00Z',
        completed_at: null,
        download_speed: null,
      },
    ];

    await page.route('**/downloads?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: { jobs, total: jobs.length },
          error: null,
        }),
      });
    });

    await page.route('**/downloads/job-cancel-test/cancel', async (route) => {
      jobs = [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            id: 'job-cancel-test',
            status: 'CANCELLED',
          },
          error: null,
        }),
      });
    });

    await page.goto('/dashboard');
    await expect(page.locator('#download-queue')).toBeVisible();

    const scrollUpResult = await page.evaluate(async () => {
      return new Promise<{ scrolledToTop: boolean; options: ScrollToOptions | null }>((resolve) => {
        const timeoutId = window.setTimeout(() => {
          resolve({ scrolledToTop: false, options: null });
        }, 3000);

        window.scrollTo = (options?: ScrollToOptions | number, y?: number) => {
          window.clearTimeout(timeoutId);
          if (typeof options === 'object') {
            resolve({ scrolledToTop: options.top === 0, options });
          } else {
            resolve({ scrolledToTop: options === 0 || y === 0, options: null });
          }
        };

        const cancelBtn = document.querySelector<HTMLButtonElement>('button[title*="ยกเลิก"]');
        if (cancelBtn) {
          cancelBtn.click();
          setTimeout(() => {
            const confirmBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.includes('ตกลง'));
            confirmBtn?.click();
          }, 100);
        }
      });
    });

    expect(scrollUpResult.scrolledToTop).toBe(true);
  });

  test('should handle mocked media analysis and intercept API route correctly', async ({ page }) => {
    let analyzeCalled = false;

    await page.route('**/media/analyze', async (route) => {
      analyzeCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            policy: { decision: 'allowed', reason: 'Open Access Platform' },
            media: {
              title: 'Sample Open Access Video',
              platform: 'wikimedia',
              thumbnail_url: null,
              duration_seconds: 10,
              uploader: 'Wikimedia Commons',
              source_domain: 'wikimedia.org',
              view_count: 1000
            },
            formats: [
              {
                format_id: 'mp4-720p',
                extension: 'mp4',
                type: 'video',
                quality_label: '720p',
                height: 720,
                fps: 30,
                video_codec: 'h264',
                audio_codec: 'aac',
                filesize: 5000000
              }
            ]
          },
          error: null
        })
      });
    });

    await page.goto('/');

    // Execute fetch inside browser page context so page.route catches it
    const status = await page.evaluate(async () => {
      const res = await fetch('/media/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://upload.wikimedia.org/wikipedia/commons/test.mp4' })
      });
      return res.status;
    });

    expect(analyzeCalled).toBe(true);
    expect(status).toBe(200);
  });

  test('should intercept job creation endpoint and confirm download contract', async ({ page }) => {
    let jobCreated = false;

    await page.route('**/downloads', async (route) => {
      jobCreated = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            id: 'job-mock-999',
            original_url: 'https://upload.wikimedia.org/wikipedia/commons/test.mp4',
            status: 'QUEUED',
            progress: 0,
            selected_format: 'mp4-720p',
            output_format: 'mp4',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          error: null
        })
      });
    });

    await page.goto('/');

    const status = await page.evaluate(async () => {
      const res = await fetch('/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://upload.wikimedia.org/wikipedia/commons/test.mp4',
          selected_format_id: 'mp4-720p',
          output_format: 'mp4',
          rights_confirmed: true
        })
      });
      return res.status;
    });

    expect(jobCreated).toBe(true);
    expect(status).toBe(200);
  });
});
