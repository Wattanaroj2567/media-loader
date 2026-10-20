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

const copy = {
  th: {
    login: "เข้าสู่ระบบ",
    register: "สมัครสมาชิก",
    forgotLink: "ลืมรหัสผ่าน?",
    forgot: "ลืมรหัสผ่าน",
    back: "กลับไปเข้าสู่ระบบ",
    privacy: "นโยบายความเป็นส่วนตัว",
    terms: "ข้อกำหนดการให้บริการ",
  },
  en: {
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
    const fullscreen = innerWidth <= 639 || (innerWidth <= 950 && innerHeight <= 480);
    const controls = Array.from(element.querySelectorAll("input, button, nav a")).map(
      (control) => control.getBoundingClientRect()
    );
    return {
      fits: fullscreen
        ? Math.abs(rect.left) <= 1 &&
          Math.abs(rect.top) <= 1 &&
          Math.abs(rect.width - innerWidth) <= 1 &&
          Math.abs(rect.height - innerHeight) <= 1
        : rect.left >= 8 &&
          rect.right <= innerWidth - 8 &&
          rect.top >= 8 &&
          rect.bottom <= innerHeight - 8,
      shapeFits: fullscreen
        ? getComputedStyle(element).borderRadius === "0px"
        : parseFloat(getComputedStyle(element).borderRadius) > 0,
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

test("auth modal opens the privacy and terms pages", async ({ page, context }) => {
  await context.addCookies([
    { name: "media-loader-locale", value: "th", url: "http://localhost:3100" },
  ]);
  await page.goto("/");
  await page
    .getByTestId("landing-topbar")
    .getByRole("button", { name: copy.th.login, exact: true })
    .click();

  const modal = page.getByRole("dialog");
  const privacyPopupPromise = page.waitForEvent("popup");
  await modal.getByRole("link", { name: copy.th.privacy }).click();
  const privacyPage = await privacyPopupPromise;
  await expect(privacyPage).toHaveURL(/\/privacy$/);
  await expect(
    privacyPage.getByRole("heading", { name: "ประกาศความเป็นส่วนตัว" })
  ).toBeVisible();
  await privacyPage.close();

  await page.goto("/");
  await page
    .getByTestId("landing-topbar")
    .getByRole("button", { name: copy.th.login, exact: true })
    .click();
  const termsPopupPromise = page.waitForEvent("popup");
  await page.getByRole("dialog").getByRole("link", { name: copy.th.terms }).click();
  const termsPage = await termsPopupPromise;
  await expect(termsPage).toHaveURL(/\/terms$/);
  await expect(
    termsPage.getByRole("heading", { name: "ข้อกำหนดการใช้งาน" })
  ).toBeVisible();
  await termsPage.close();
});

for (const screen of [screens[1], screens[4]]) {
  test(`light ${screen.name}: modal stays readable and within viewport`, async ({
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
    await checkLayout(page);
    await page.getByRole("dialog").getByRole("heading").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: test.info().outputPath(`login-light-${screen.name}.png`),
    });
  });
}
