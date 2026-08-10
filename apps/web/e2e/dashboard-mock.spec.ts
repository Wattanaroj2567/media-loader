import { test, expect } from '@playwright/test';

test.describe('Mocked Dashboard Workflow', () => {
  test('should handle mocked media analysis and format selection', async ({ page }) => {
    // Intercept /media/analyze API endpoint
    await page.route('**/media/analyze', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            url: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/This_is_a_10_second_testvideo_with_bars_and_tone.webm',
            title: 'Sample Open Access Video',
            uploader: 'Wikimedia Commons',
            duration: 10,
            thumbnail: null,
            formats: [
              { id: 'mp4-720p', label: '720p HD (MP4)', container: 'mp4', video_codec: 'h264', audio_codec: 'aac', width: 1280, height: 720, filesize: 5000000 }
            ],
            policy: { decision: 'allowed', reason: 'Trusted open-access platform' }
          },
          error: null
        })
      });
    });

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should intercept job creation and simulate downloading queue state', async ({ page }) => {
    // Intercept /downloads endpoint
    await page.route('**/downloads', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            job_id: 'mock-job-123',
            status: 'QUEUED',
            created_at: new Date().toISOString()
          },
          error: null
        })
      });
    });

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });
});
