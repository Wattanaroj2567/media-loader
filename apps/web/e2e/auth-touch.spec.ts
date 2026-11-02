import { test, expect } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  locale: "en-US",
});

test("touch auth navigation does not leave the close link highlighted", async ({
  page,
}) => {
  await page.goto("/auth/login");
  const close = page.getByRole("link", { name: "Close", exact: true });
  await expect(close).toBeVisible();
  const normalColor = await close.evaluate(
    (element) => getComputedStyle(element).color
  );
  await close.hover();
  await expect(close).toHaveCSS("color", normalColor);
  await page.getByRole("link", { name: "Create account", exact: true }).tap();
  await expect(page).toHaveURL(/\/auth\/register$/);
  await expect(close).toHaveCSS("color", normalColor);
  await page.getByRole("link", { name: "Back to sign in", exact: true }).tap();
  await expect(page).toHaveURL(/\/auth\/login$/);
  await expect(close).toHaveCSS("color", normalColor);
});

for (const mode of ["login", "register"] as const) {
  test(`mobile ${mode} is visible before hydration`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      javaScriptEnabled: false,
      locale: "en-US",
    });
    try {
      const page = await context.newPage();
      await page.goto(new URL(`/auth/${mode}`, test.info().project.use.baseURL).href);
      await expect(page.getByRole("main").getByRole("heading")).toBeVisible();
      await expect(page.locator("#auth-email")).toBeVisible();
    } finally {
      await context.close();
    }
  });
}

test("desktop modal close responds to mouse hover", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    isMobile: false,
    hasTouch: false,
    locale: "en-US",
  });
  try {
    const page = await context.newPage();
    await page.goto(new URL("/auth/login", test.info().project.use.baseURL).href);
    const close = page
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true });
    await expect(close).toBeVisible();
    const normalColor = await close.evaluate(
      (element) => getComputedStyle(element).color
    );
    await close.hover();
    await expect(close).not.toHaveCSS("color", normalColor);
    await page.mouse.move(0, 0);
    await expect(close).toHaveCSS("color", normalColor);
  } finally {
    await context.close();
  }
});
