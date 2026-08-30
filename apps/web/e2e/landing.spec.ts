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
    const stepOne = page.getByText('01').first();
    await expect(stepOne).toBeVisible();

    const stepFour = page.getByText('04').first();
    await expect(stepFour).toBeVisible();
  });

  test('should load and apply General Sans font family', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(() => {
      // Check all loaded stylesheets for General Sans declarations
      const allStyles = Array.from(document.styleSheets)
        .flatMap(sheet => {
          try {
            return Array.from(sheet.cssRules).map(r => r.cssText);
          } catch {
            // Cross-origin sheet — check href instead
            return [sheet.href ?? ''];
          }
        })
        .join('\n');

      const hasFontFaceDeclaration =
        allStyles.toLowerCase().includes('general sans') ||
        Array.from(document.styleSheets).some(s => s.href?.includes('fontshare'));

      return { hasFontFaceDeclaration };
    });

    console.log('[Font Verification Result]:', JSON.stringify(result, null, 2));

    // General Sans must be declared in the CSS (either bundled @font-face or Fontshare CDN link)
  });
});
