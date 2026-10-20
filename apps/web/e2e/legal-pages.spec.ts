import { expect, test } from "@playwright/test";

test.describe("Privacy and terms pages", () => {
  test("theme menu switches the page between light and dark", async ({ page }) => {
    await page.goto("/privacy");

    const themeButton = page.locator('button[aria-haspopup="true"]');
    await themeButton.click();
    await page.getByRole("button", { name: "Light" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    const lightBackground = await page
      .locator("main")
      .evaluate((element) => getComputedStyle(element).backgroundColor);

    await themeButton.click();
    await page.getByRole("button", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    const darkBackground = await page
      .locator("main")
      .evaluate((element) => getComputedStyle(element).backgroundColor);

    expect(darkBackground).not.toBe(lightBackground);
  });

  test("footer links open the matching pages", async ({ page }) => {
    await page.goto("/");

    const footer = page.getByTestId("site-footer");
    await footer.locator('a[href="/privacy"]').click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.locator("h1")).toBeVisible();

    await page.getByTestId("site-footer").locator('a[href="/terms"]').click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("legal pages remain readable on a narrow mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    for (const path of ["/privacy", "/terms"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /key points|ประเด็นสำคัญ/i })
      ).toBeVisible();

      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(pageWidth).toBeLessThanOrEqual(375);

      const mobileContents = page.locator("details");
      await expect(mobileContents).toBeVisible();
      await expect(mobileContents).not.toHaveAttribute("open", "");
      await mobileContents.locator("summary").click();
      const firstSectionLink = mobileContents.locator('a[href^="#"]').first();
      await expect(firstSectionLink).toBeVisible();
      await firstSectionLink.click();
      await expect(page).toHaveURL(/#(?:privacy|terms)-section-1$/);
      const kind = path.slice(1);
      const activeHref = await page.evaluate((sectionKind) => {
        const sections = Array.from(
          document.querySelectorAll<HTMLElement>(
            `article section[id^="${sectionKind}-section-"]`
          )
        );
        const readingLine = window.innerHeight * 0.35;
        const activeSection =
          sections
            .filter((section) => section.getBoundingClientRect().top <= readingLine)
            .at(-1) ?? sections[0];
        return `#${activeSection.id}`;
      }, kind);
      const activeSectionLink = mobileContents.locator(`a[href="${activeHref}"]`);
      await expect(activeSectionLink).toHaveAttribute("aria-current", "location");

      const activeSectionNumber = Number(activeHref.split("-").at(-1));
      const nextSectionLink = mobileContents.locator(
        `a[href="#${kind}-section-${activeSectionNumber + 1}"]`
      );
      await nextSectionLink.click();
      await expect(nextSectionLink).toHaveAttribute("aria-current", "location");
      await expect(activeSectionLink).not.toHaveAttribute("aria-current", "location");

      const lastSectionLink = mobileContents.locator(`a[href="#${kind}-section-7"]`);
      await lastSectionLink.click();
      await expect(lastSectionLink).toHaveAttribute("aria-current", "location");

      await page.getByTestId("site-footer").scrollIntoViewIfNeeded();
      await expect(
        page.getByTestId("site-footer").locator('a[href="/privacy"]')
      ).toBeVisible();
    }
  });
});
