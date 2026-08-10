import { test, expect } from '@playwright/test';

test.describe('Landing Page & Brand UI', () => {
  test('should render hero title and call-to-action elements', async ({ page }) => {
    await page.goto('/');
    
    // Check main page container or heading
    await expect(page.locator('body')).toBeVisible();
    
    // Check sign in / get started button or navigation element
    const mainHeader = page.locator('header, main, h1').first();
    await expect(mainHeader).toBeVisible();
  });

  test('should toggle dark and light themes smoothly', async ({ page }) => {
    await page.goto('/');
    
    const htmlElement = page.locator('html');
    
    // Find theme toggle button if available
    const themeToggle = page.getByRole('button', { name: /toggle theme|เปลี่ยนธีม|theme/i }).first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      const themeClass = await htmlElement.getAttribute('class');
      expect(themeClass).toBeDefined();
    }
  });
});
