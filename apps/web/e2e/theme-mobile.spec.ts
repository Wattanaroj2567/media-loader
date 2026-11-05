import { expect, test } from "@playwright/test";

test.use({
  locale: "en-US",
  viewport: { width: 390, height: 844 },
  hasTouch: true,
});

test("mobile theme choices update the browser color and follow the system", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const color = page.locator('meta[name="theme-color"]');
  await expect(color).toHaveAttribute("content", "#edf1f6");
  await page.getByRole("button", { name: "More options (Language & Theme)" }).tap();
  await page.getByRole("radio", { name: /dark/i }).tap();
  await expect(color).toHaveAttribute("content", "#101010");
  await page.getByRole("radio", { name: /system/i }).tap();
  await expect(color).toHaveAttribute("content", "#edf1f6");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(color).toHaveAttribute("content", "#101010");
});
