import { test, expect, type Page } from "@playwright/test";

const screens = [
  { width: 320, height: 568, name: "small-mobile" },
  { width: 390, height: 844, name: "mobile" },
  { width: 768, height: 1024, name: "tablet" },
  { width: 1024, height: 768, name: "tablet-landscape" },
  { width: 1440, height: 900, name: "desktop" },
  { width: 844, height: 390, name: "mobile-landscape" },
  { width: 390, height: 420, name: "reduced-height" },
];

for (const mode of ["login", "register", "forgot-password"] as const) {
  test(`auth ${mode}: resize switches both directions`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/auth/${mode}`);
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page).toHaveURL(new RegExp(`/auth/${mode}$`));
    await checkFullPageLayout(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").locator("#auth-email")).toBeVisible();
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page).toHaveURL(new RegExp(`/auth/${mode}$`));
    await checkFullPageLayout(page);
  });
  for (const mobile of [true, false]) {
    test(`direct auth ${mode}: ${mobile ? "mobile page" : "desktop modal"}`, async ({
      page,
    }) => {
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }
      );
      await page.goto(`/auth/${mode}`);
      if (mobile) {
        await expect(page).toHaveURL(new RegExp(`/auth/${mode}$`));
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(page.locator("#auth-email")).toBeVisible();
      } else {
        const modal = page.getByRole("dialog");
        await expect(modal).toBeVisible();
        await expect(modal.locator("#auth-email")).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`/\\?auth=${mode}$`));
        await modal.locator("button").first().click();
        await expect(modal).not.toBeVisible();
        await expect(page).toHaveURL(/\/$/);
      }
    });
  }
}

const copy = {
  th: {
    close: "ปิด",
    login: "เข้าสู่ระบบ",
    register: "สมัครสมาชิก",
    forgotLink: "ลืมรหัสผ่าน?",
    forgot: "ลืมรหัสผ่าน",
    back: "กลับไปเข้าสู่ระบบ",
    privacy: "นโยบายความเป็นส่วนตัว",
    terms: "ข้อกำหนดการให้บริการ",
  },
  en: {
    close: "Close",
    login: "Sign in",
    register: "Create account",
    forgotLink: "Forgot password?",
    forgot: "Forgot password",
    back: "Back to sign in",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
  },
};

async function checkLayout(page: Page) {
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  await expect(modal.getByRole("heading")).toBeInViewport();
  const layout = await modal.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const scroll = element.querySelector('[data-testid="auth-modal-scroll"]')!;
    const headingRange = document.createRange();
    headingRange.selectNodeContents(element.querySelector("h1")!);
    const heading = headingRange.getBoundingClientRect();
    const close = element.querySelector("button")!.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportBottom = viewportTop + (viewport?.height ?? innerHeight);
    const scrollRect = scroll.getBoundingClientRect();
    const style = getComputedStyle(element);
    const controls = Array.from(element.querySelectorAll("input, button, nav a")).map(
      (control) => control.getBoundingClientRect()
    );
    return {
      fits:
        rect.left >= 15 &&
        rect.right <= innerWidth - 15 &&
        rect.width <= 393 &&
        rect.top >= viewportTop + 15 &&
        rect.bottom <= viewportBottom - 15,
      shapeFits: style.borderRadius === "16px",
      scrollFits:
        scrollRect.top >= rect.top + parseFloat(style.borderTopWidth) - 1 &&
        scrollRect.bottom <= rect.bottom - parseFloat(style.borderBottomWidth) + 1,
      scrollsSideways: scroll.scrollWidth > scroll.clientWidth + 1,
      pageScrollsSideways: document.documentElement.scrollWidth > innerWidth,
      controlsFit: controls.every(
        (control) => control.left >= rect.left && control.right <= rect.right + 1
      ),
      headingHitsClose:
        heading.left < close.right &&
        heading.right > close.left &&
        heading.top < close.bottom &&
        heading.bottom > close.top,
      inputFont: Math.min(
        ...Array.from(element.querySelectorAll("input")).map((input) =>
          parseFloat(getComputedStyle(input).fontSize)
        )
      ),
    };
  });
  expect(layout).toMatchObject({
    fits: true,
    shapeFits: true,
    scrollFits: true,
    scrollsSideways: false,
    pageScrollsSideways: false,
    controlsFit: true,
    headingHitsClose: false,
  });
  expect(layout.inputFont).toBeGreaterThanOrEqual(16);
  const submit = modal.locator('button[type="submit"]');
  await submit.scrollIntoViewIfNeeded();
  await expect(submit).toBeInViewport();
  await expect(modal.getByRole("button").first()).toBeInViewport();
  const footer = modal.locator("nav, p:has(> a[href='/privacy'])").last();
  await footer.scrollIntoViewIfNeeded();
  // Allow subpixel intersection rounding while checking the dialog bounds below.
  await expect(footer).toBeInViewport({ ratio: 0.99 });
  // The scrollport itself must fit: viewport intersection alone cannot detect
  // content clipped by the dialog's overflow-hidden border box.
  await expect
    .poll(() =>
      footer.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const dialog = element.closest("dialog")!.getBoundingClientRect();
        return rect.top >= dialog.top - 1 && rect.bottom <= dialog.bottom + 1;
      })
    )
    .toBe(true);
}

async function checkFullPageLayout(page: Page) {
  const main = page.locator("main:has(#auth-email)");
  await expect(main).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const pagePanel = main.locator(":scope > div").first();
  const fillsScreenHeight = await main.evaluate(
    (element) => element.getBoundingClientRect().height >= window.innerHeight - 1
  );
  const layout = await pagePanel.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      fillsScreenWidth:
        Math.abs(rect.width - element.parentElement!.getBoundingClientRect().width) <=
        1,
      hasNoCardFrame: getComputedStyle(element).borderRadius === "0px",
      pageScrollsSideways: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  expect(fillsScreenHeight).toBe(true);
  expect(layout).toEqual({
    fillsScreenWidth: true,
    hasNoCardFrame: true,
    pageScrollsSideways: false,
  });
  await expect(main.getByRole("heading")).toBeInViewport();
  await expect
    .poll(async () => {
      const heading = await main.getByRole("heading").boundingBox();
      return heading !== null && heading.y >= 20 && heading.y <= 45;
    })
    .toBe(true);
  const submit = main.locator('button[type="submit"]');
  await submit.scrollIntoViewIfNeeded();
  await expect(submit).toBeInViewport();
}

for (const locale of ["th", "en"] as const) {
  for (const screen of screens) {
    test(`${locale} ${screen.name}: login, registration and recovery fit`, async ({
      page,
      context,
    }) => {
      const labels = copy[locale];
      await context.addCookies([
        { name: "media-loader-locale", value: locale, url: "http://localhost:3100" },
      ]);
      await page.setViewportSize(screen);
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto("/");
      await page
        .getByPlaceholder("https://...")
        .fill("https://example.com/public-video.mp4");
      await page.getByPlaceholder("https://...").press("Enter");

      const fullPageAuth =
        screen.width <= 639 || (screen.width <= 950 && screen.height <= 480);
      if (fullPageAuth) {
        await expect(page).toHaveURL(/\/auth\/login$/);
        await checkFullPageLayout(page);
        const main = page.getByRole("main");
        await expect(main.getByRole("link", { name: labels.close })).toHaveAttribute(
          "href",
          "/"
        );
        await expect(main.locator("header")).toBeHidden();
        await expect(main.locator("footer")).toBeHidden();
        await expect(
          main.getByRole("link", { name: labels.register, exact: true })
        ).toHaveAttribute("href", "/auth/register");
        await expect(
          main.getByRole("link", { name: labels.privacy, exact: true })
        ).toHaveAttribute("href", "/privacy");
        await expect(
          main.getByRole("link", { name: labels.terms, exact: true })
        ).toHaveAttribute("href", "/terms");
        if (locale === "th" && ["mobile", "mobile-landscape"].includes(screen.name)) {
          await page.screenshot({
            path: test.info().outputPath(`login-full-page-${screen.name}.png`),
          });
        }

        await main.getByRole("link", { name: labels.register, exact: true }).click();
        await expect(page).toHaveURL(/\/auth\/register$/);
        await checkFullPageLayout(page);
        await page
          .getByRole("main")
          .getByRole("link", { name: labels.back, exact: true })
          .click();
        await expect(page).toHaveURL(/\/auth\/login$/);
        await page
          .getByRole("main")
          .getByRole("link", { name: labels.forgotLink, exact: true })
          .click();
        await expect(page).toHaveURL(/\/auth\/forgot-password$/);
        await checkFullPageLayout(page);
        await page
          .getByRole("main")
          .getByRole("link", { name: labels.back, exact: true })
          .click();
        await expect(page).toHaveURL(/\/auth\/login$/);
        return;
      }

      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible();
      expect(await modal.getByRole("heading").isVisible()).toBe(true);
      const initialHeight = await modal.evaluate(
        (element) => element.getBoundingClientRect().height
      );
      expect(initialHeight).toBeGreaterThan(200);
      await expect(modal).toHaveAccessibleName(labels.login);
      await checkLayout(page);
      const legalLinks = modal;
      await expect(
        legalLinks.getByRole("link", { name: labels.privacy, exact: true })
      ).toHaveAttribute("href", "/privacy");
      await expect(
        legalLinks.getByRole("link", { name: labels.terms, exact: true })
      ).toHaveAttribute("href", "/terms");
      if (locale === "th" && ["mobile", "tablet", "desktop"].includes(screen.name)) {
        await modal.getByRole("heading").scrollIntoViewIfNeeded();
        await page.screenshot({
          path: test.info().outputPath(`login-${screen.name}.png`),
        });
      }
      await modal.getByRole("heading").click();
      await expect(modal.locator("#auth-email")).not.toHaveAttribute(
        "aria-invalid",
        "true"
      );
      await expect(modal.locator("#auth-email-error")).toBeEmpty();
      await modal.getByRole("link", { name: labels.register, exact: true }).click();
      await expect(modal).toHaveAccessibleName(labels.register);
      await checkLayout(page);
      await expect(
        legalLinks.getByRole("link", { name: labels.privacy })
      ).toBeVisible();
      await expect(legalLinks.getByRole("link", { name: labels.terms })).toBeVisible();
      if (locale === "th" && ["mobile", "desktop"].includes(screen.name)) {
        await modal.getByRole("heading").scrollIntoViewIfNeeded();
        await page.screenshot({
          path: test.info().outputPath(`register-${screen.name}.png`),
        });
      }
      await modal.getByRole("link", { name: labels.back, exact: true }).click();
      await modal.getByRole("link", { name: labels.forgotLink, exact: true }).click();
      await expect(modal).toHaveAccessibleName(labels.forgot);
      await checkLayout(page);
      await modal.getByRole("link", { name: labels.back, exact: true }).click();
      await expect(modal).toHaveAccessibleName(labels.login);
      await modal.press("Escape");
      await expect(modal).not.toBeVisible();
      await expect(page.getByPlaceholder("https://...")).toHaveValue(
        "https://example.com/public-video.mp4"
      );
    });
  }
}

test("open registration modal keeps its footer reachable after viewport shrink", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  await page.getByPlaceholder("https://...").fill("https://example.com/video.mp4");
  await page.getByPlaceholder("https://...").press("Enter");
  const modal = page.getByRole("dialog");
  await modal.locator('a[href="/auth/register"]').click();
  await page.setViewportSize({ width: 390, height: 420 });
  await modal.getByRole("heading").scrollIntoViewIfNeeded();
  await checkLayout(page);
});

test("auth modal navigates to privacy and terms in the same tab", async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: "media-loader-locale", value: "th", url: "http://localhost:3100" },
  ]);
  await page.goto("/");
  await page
    .getByTestId("landing-topbar")
    .getByRole("button", { name: copy.th.login, exact: true })
    .click();

  const modal = page.getByRole("dialog");
  await modal.getByRole("link", { name: copy.th.privacy }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(
    page.getByRole("heading", { name: "ประกาศความเป็นส่วนตัว" })
  ).toBeVisible();

  await page.goto("/");
  await page
    .getByTestId("landing-topbar")
    .getByRole("button", { name: copy.th.login, exact: true })
    .click();
  await page.getByRole("dialog").getByRole("link", { name: copy.th.terms }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole("heading", { name: "ข้อกำหนดการใช้งาน" })).toBeVisible();
});

for (const screen of [screens[1], screens[4]]) {
  test(`light ${screen.name}: auth stays readable and fits the viewport`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "media-loader-locale", value: "th", url: "http://localhost:3100" },
    ]);
    await page.setViewportSize(screen);
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page
      .getByTestId("landing-topbar")
      .getByRole("button", { name: copy.th.login, exact: true })
      .click();
    const fullPageAuth =
      screen.width <= 639 || (screen.width <= 950 && screen.height <= 480);
    if (fullPageAuth) {
      await expect(page).toHaveURL(/\/auth\/login$/);
      await checkFullPageLayout(page);
      await page.screenshot({
        path: test.info().outputPath(`login-light-full-page-${screen.name}.png`),
      });
      return;
    }
    await checkLayout(page);
    await page.getByRole("dialog").getByRole("heading").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: test.info().outputPath(`login-light-${screen.name}.png`),
    });
  });
}
