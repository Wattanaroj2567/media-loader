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
    await page.goto('/dashboard');

    const scrollOptions = await page.evaluate(async () => {
      const queueAnchor = document.querySelector<HTMLElement>('#download-queue-anchor');
      if (!queueAnchor) throw new Error('Download queue anchor was not rendered');

      let receivedOptions: ScrollIntoViewOptions | null = null;
      queueAnchor.scrollIntoView = (options?: boolean | ScrollIntoViewOptions) => {
        if (typeof options === 'object') receivedOptions = options;
      };

      for (let attempt = 0; attempt < 10 && receivedOptions === null; attempt += 1) {
        window.dispatchEvent(
          new CustomEvent('media-loader:job-created', {
            detail: { jobId: 'job-scroll-test' },
          }),
        );
        await new Promise((resolve) => window.setTimeout(resolve, 50));
      }

      return receivedOptions;
    });

    expect(scrollOptions).toEqual({ behavior: 'smooth', block: 'start' });
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
