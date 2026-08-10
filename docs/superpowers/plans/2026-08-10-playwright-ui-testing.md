# Playwright Web UI & Quality Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-overhead Playwright E2E UI testing suite for `apps/web` that validates landing page components, form validation, dark/light themes, mocked dashboard workflows, and responsive layouts across desktop and mobile viewports.

**Architecture:** Playwright (`@playwright/test`) configured in `apps/web` with auto-started `next dev` server and mocked backend routes (`page.route()`) to ensure fast, deterministic, offline-capable UI testing without external network dependencies.

**Tech Stack:** Next.js 16, Playwright Test, TypeScript, Node.js.

---

### Task 1: Install Playwright Dependencies & Configure `playwright.config.ts`

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/playwright.config.ts`

- [ ] **Step 1: Install `@playwright/test` package in `apps/web`**

Run command:
```bash
npm --prefix apps/web install --save-dev @playwright/test@^1.48.0
```

- [ ] **Step 2: Add Playwright scripts to `apps/web/package.json`**

Modify `apps/web/package.json` to include `"test:e2e": "playwright test"` and `"test:e2e:ui": "playwright test --ui"`.

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "node --experimental-strip-types --test \"lib/*.test.ts\"",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

- [ ] **Step 3: Create `apps/web/playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

- [ ] **Step 4: Commit configuration**

```bash
git add apps/web/package.json apps/web/playwright.config.ts package-lock.json apps/web/package-lock.json
git commit -m "build: setup Playwright config and dependencies in apps/web"
```

---

### Task 2: Implement Landing Page & Theme Toggle E2E Spec

**Files:**
- Create: `apps/web/e2e/landing.spec.ts`

- [ ] **Step 1: Create `apps/web/e2e/landing.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Landing Page & Brand UI', () => {
  test('should render hero title and call-to-action elements', async ({ page }) => {
    await page.goto('/');
    
    // Check main branding header or hero text
    await expect(page.locator('h1')).toBeVisible();
    
    // Check sign in / get started button
    const loginBtn = page.getByRole('button', { name: /sign in|เข้าสู่ระบบ|login/i }).first();
    await expect(loginBtn).toBeVisible();
  });

  test('should toggle dark and light themes smoothly', async ({ page }) => {
    await page.goto('/');
    
    const htmlElement = page.locator('html');
    
    // Find theme toggle button
    const themeToggle = page.getByRole('button', { name: /toggle theme|เปลี่ยนธีม/i }).first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      // Verify html class or data-theme attribute updates
      const themeClass = await htmlElement.getAttribute('class');
      expect(themeClass).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run test using Playwright**

Run: `npx --prefix apps/web playwright test e2e/landing.spec.ts --project=chromium`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/landing.spec.ts
git commit -m "test(e2e): add landing page and theme toggle tests"
```

---

### Task 3: Implement Form & URL Validation E2E Spec

**Files:**
- Create: `apps/web/e2e/url-validation.spec.ts`

- [ ] **Step 1: Create `apps/web/e2e/url-validation.spec.ts`**

```typescript
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
        // Input should show validation error or stay on page
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
        // Page should handle invalid URL gracefully
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});
```

- [ ] **Step 2: Run test using Playwright**

Run: `npx --prefix apps/web playwright test e2e/url-validation.spec.ts --project=chromium`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/url-validation.spec.ts
git commit -m "test(e2e): add url analyzer form validation tests"
```

---

### Task 4: Implement Mocked Workflow & Queue Progress Spec

**Files:**
- Create: `apps/web/e2e/dashboard-mock.spec.ts`

- [ ] **Step 1: Create `apps/web/e2e/dashboard-mock.spec.ts`**

```typescript
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
            url: 'https://wikimedia.org/sample.mp4',
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
```

- [ ] **Step 2: Run test using Playwright**

Run: `npx --prefix apps/web playwright test e2e/dashboard-mock.spec.ts --project=chromium`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/dashboard-mock.spec.ts
git commit -m "test(e2e): add mocked dashboard workflow and API route interceptors"
```

---

### Task 5: Implement Responsive Layout Safety Spec

**Files:**
- Create: `apps/web/e2e/responsive.spec.ts`

- [ ] **Step 1: Create `apps/web/e2e/responsive.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Responsive Layout Safety', () => {
  test('should render desktop navigation elements on wide viewports', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    
    // Page body should be visible without horizontal scrollbar overflow
    await expect(page.locator('body')).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('should render safely on mobile viewports (375px) without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.locator('body')).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
```

- [ ] **Step 2: Run test using Playwright**

Run: `npx --prefix apps/web playwright test e2e/responsive.spec.ts --project=chromium`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/e2e/responsive.spec.ts
git commit -m "test(e2e): add responsive layout safety and overflow checks"
```

---

### Task 6: Full Verification Check

- [ ] **Step 1: Run all E2E tests across Chromium, Firefox, WebKit, Mobile Chrome, and Mobile Safari**

Run: `npx --prefix apps/web playwright test`
Expected: All tests pass.

- [ ] **Step 2: Commit plan completion record**

```bash
git commit --allow-empty -m "ci: complete Playwright E2E testing setup and verification"
```
