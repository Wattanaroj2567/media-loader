import { test, expect } from '@playwright/test';

test.describe('Account Settings Page UI', () => {
  test('should render settings page container and account sections', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.locator('main')).toBeVisible();

    const mainHeading = page.locator('h1, h2, header').first();
    await expect(mainHeading).toBeVisible();
  });
});
