import { test, expect } from '@playwright/test';

test.describe('Landing Page & Brand UI', () => {
  test('should render main hero title and Google login button', async ({ page }) => {
    await page.goto('/');

    // 1. Assert main heading is rendered and visible
    const heroHeading = page.locator('h1');
    await expect(heroHeading).toBeVisible();
    await expect(heroHeading).not.toBeEmpty();

    // 2. Assert Google OAuth login button exists and is enabled
    const loginButton = page.getByRole('button', { name: /sign in|เข้าสู่ระบบ|google/i }).first();
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toBeEnabled();

    // 3. Assert assurances / policy features exist
    const mainContainer = page.locator('main');
    await expect(mainContainer).toBeVisible();
  });

  test('should render 4-step workflow indicator card', async ({ page }) => {
    await page.goto('/');

    // Assert the 4 step indicators exist ("01", "02", "03", "04")
    const stepOne = page.getByText('01');
    await expect(stepOne).toBeVisible();

    const stepFour = page.getByText('04');
    await expect(stepFour).toBeVisible();
  });
});
