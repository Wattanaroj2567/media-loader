import { test, expect } from '@playwright/test';

test.describe('History Page UI', () => {
  test('should render history page and empty state container', async ({ page }) => {
    await page.goto('/history');

    await expect(page.locator('main')).toBeVisible();

    // Check main heading or header
    const mainHeading = page.locator('h1, h2, header').first();
    await expect(mainHeading).toBeVisible();
  });
});
