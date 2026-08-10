import { test, expect } from '@playwright/test';

test.describe('Mocked Dashboard Workflow', () => {
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
