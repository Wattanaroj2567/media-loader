import { test, expect } from "@playwright/test";

test.use({ locale: "en-US", viewport: { width: 1440, height: 900 } });

for (const scheme of ["light", "dark"] as const) {
  test(`${scheme}: URL input has a crisp focus border without a halo`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    const input = page.getByPlaceholder("https://...");
    const frame = input.locator("..");
    await expect(input).toBeVisible();
    const normalBorder = await frame.evaluate(
      (element) => getComputedStyle(element).borderTopColor
    );
    await frame.hover();
    await expect(frame).not.toHaveCSS("border-top-color", normalBorder);
    await input.focus();
    await page.mouse.move(0, 0);
    await expect(frame).not.toHaveCSS("border-top-color", normalBorder);
    await expect(frame).toHaveCSS("border-top-width", "1px");
    const shadow = await frame.evaluate(
      (element) => getComputedStyle(element).boxShadow
    );
    expect(shadow === "none" || !/[1-9]\d*(?:\.\d+)?px/.test(shadow)).toBe(true);
  });
  test(`${scheme}: language and theme use matching thin hover borders without glow`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    const controls = [
      page.getByRole("button", { name: /^Select language/ }),
      page.getByRole("button", { name: /^Display Theme:/ }),
    ];
    const hoveredBorders: string[] = [];
    for (const control of controls) {
      await expect(control).toBeVisible();
      const before = await control.evaluate((element) => ({
        border: getComputedStyle(element).borderTopColor,
        radius: getComputedStyle(element).borderRadius,
      }));
      await control.hover();
      await expect(control).not.toHaveCSS("border-top-color", before.border);
      await expect(control).toHaveCSS("border-top-width", "1px");
      await expect(control).toHaveCSS("border-radius", before.radius);
      await control.click();
      await expect(control).toHaveAttribute("aria-expanded", "true");
      await control.evaluate(async (element) => {
        await Promise.all(
          element
            .getAnimations()
            .map((animation) => animation.finished.catch(() => undefined))
        );
      });
      const visual = await control.evaluate((element) => ({
        border: getComputedStyle(element).borderTopColor,
        shadow: getComputedStyle(element).boxShadow,
      }));
      hoveredBorders.push(visual.border);
      expect(
        visual.shadow === "none" || !/[1-9]\d*(?:\.\d+)?px/.test(visual.shadow)
      ).toBe(true);
      await page.keyboard.press("Escape");
      await expect(control).toHaveAttribute("aria-expanded", "false");
      await page.mouse.move(0, 0);
    }
    expect(hoveredBorders[0]).toBe(hoveredBorders[1]);
  });
}
