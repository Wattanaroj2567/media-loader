import { test, expect } from "@playwright/test";

const APP_ORIGIN = "http://localhost:3100";
const SESSION_COOKIE = "sb-localhost-auth-token";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

const fakeUser = {
  id: "user-responsive-test",
  aud: "authenticated",
  role: "authenticated",
  email: "responsive@example.com",
  app_metadata: { provider: "google" },
  user_metadata: { full_name: "Responsive Test User" },
};

function fakeJwt() {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: fakeUser.id,
    aud: "authenticated",
    role: "authenticated",
    exp: now + 7200,
    iat: now,
    email: fakeUser.email,
  })}.fakesignature`;
}

async function seedAuth(context: {
  addCookies: (
    cookies: { name: string; value: string; url: string }[]
  ) => Promise<void>;
}) {
  const session = {
    access_token: fakeJwt(),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "fake-refresh-token",
    user: fakeUser,
  };
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  await context.addCookies([{ name: SESSION_COOKIE, value, url: APP_ORIGIN }]);
}

test.describe("Responsive Layout Safety", () => {
  test("keeps the mobile browser color in sync on public and account pages", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const publicPages = [
      "/",
      "/how-it-works",
      "/contact",
      "/privacy",
      "/terms",
      "/auth/login",
      "/auth/register",
      "/auth/forgot-password",
      "/auth/reset-password?token_hash=responsive-test&type=recovery",
    ];
    const accountPages = ["/dashboard", "/history", "/settings"];

    for (const scheme of ["light", "dark"] as const) {
      await context.clearCookies();
      await page.emulateMedia({ colorScheme: scheme });
      for (const [pages, authenticated] of [
        [publicPages, false],
        [accountPages, true],
      ] as const) {
        if (authenticated) await seedAuth(context);
        for (const path of pages) {
          await test.step(`${scheme}: ${path}`, async () => {
            await page.goto(path, { waitUntil: "domcontentloaded" });
            await expect(page).toHaveURL(new RegExp(path.split("?")[0] + "(?:\\?|$)"));
            await expect(page.locator("main")).toBeVisible();
            await expect(page.locator("html")).toHaveClass(
              new RegExp(`\\b${scheme}\\b`)
            );
            await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
              "content",
              scheme === "dark" ? "#101010" : "#edf1f6"
            );
          });
        }
      }
    }
  });

  test("should render desktop navigation elements on wide viewports (1280px)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    await expect(page.locator("main")).toBeVisible();

    const isHorizontalScrollbarPresent = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
    });

    expect(isHorizontalScrollbarPresent).toBe(false);
  });

  test("should render safely on mobile viewports (375px) without overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    await expect(page.locator("main")).toBeVisible();

    const isHorizontalScrollbarPresent = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
    });

    expect(isHorizontalScrollbarPresent).toBe(false);
  });

  test("keeps every user-facing page within mobile, tablet, and desktop widths", async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    await page.route("**/downloads*", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: CORS_HEADERS });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({
          ok: true,
          data: { jobs: [], total: 0, limit: 100, offset: 0 },
          error: null,
        }),
      });
    });
    await page.route("**/notifications/**", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: CORS_HEADERS });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: JSON.stringify({ ok: true, data: { enabled: false }, error: null }),
      });
    });

    const publicPages = [
      "/",
      "/how-it-works",
      "/contact",
      "/privacy",
      "/terms",
      "/auth/login",
      "/auth/register",
      "/auth/forgot-password",
      "/auth/reset-password?token_hash=responsive-test&type=recovery",
    ];
    const accountPages = ["/dashboard", "/history", "/settings"];
    const viewportWidths = [320, 375, 768, 1024, 1280, 1440];

    for (const width of viewportWidths) {
      await context.clearCookies();
      await page.setViewportSize({ width, height: 900 });
      for (const path of publicPages) {
        await test.step(`${path} at ${width}px`, async () => {
          await page.goto(path, { waitUntil: "domcontentloaded" });
          await expect(page.locator("main")).toBeVisible();
          const pageWidth = await page.evaluate(() =>
            Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
          );
          expect(pageWidth, `${path} overflows at ${width}px`).toBeLessThanOrEqual(
            width
          );
        });
      }

      await seedAuth(context);
      for (const path of accountPages) {
        await test.step(`${path} at ${width}px`, async () => {
          await page.goto(path, { waitUntil: "domcontentloaded" });
          await expect(page.locator("main")).toBeVisible();
          const pageWidth = await page.evaluate(() =>
            Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
          );
          expect(pageWidth, `${path} overflows at ${width}px`).toBeLessThanOrEqual(
            width
          );
        });
      }
    }
  });
});
