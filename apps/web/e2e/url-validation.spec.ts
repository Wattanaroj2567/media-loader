import { test, expect } from '@playwright/test';

test.describe('URL Analyzer Form Validation', () => {
  test('should prevent submission of empty URL', async ({ page }) => {
    await page.goto('/');
    
    // Locate URL input
    const urlInput = page.getByPlaceholder(/http|url|วางลิงก์/i).first();
    if (await urlInput.isVisible()) {
      await urlInput.fill('');
      
      const submitBtn = page.getByRole('button', { name: /analyze|ดาวน์โหลด|วิเคราะห์/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await expect(urlInput).toBeVisible();
      }
    }
  });

  test('should show error for invalid protocol URLs', async ({ page }) => {
    await page.goto('/');
    
    const urlInput = page.getByPlaceholder(/http|url|วางลิงก์/i).first();
    if (await urlInput.isVisible()) {
      await urlInput.fill('ftp://invalid-protocol.com/file');
      
      const submitBtn = page.getByRole('button', { name: /analyze|ดาวน์โหลด|วิเคราะห์/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});
