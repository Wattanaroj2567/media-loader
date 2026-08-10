import { test, expect } from '@playwright/test';

test.describe('Responsive Layout Safety', () => {
  test('should render desktop navigation elements on wide viewports (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await expect(page.locator('main')).toBeVisible();

    const isHorizontalScrollbarPresent = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(isHorizontalScrollbarPresent).toBe(false);
  });

  test('should render safely on mobile viewports (375px) without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.locator('main')).toBeVisible();

    const isHorizontalScrollbarPresent = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(isHorizontalScrollbarPresent).toBe(false);
  });
});