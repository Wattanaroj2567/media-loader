import { test, expect } from "@playwright/test";

test.use({ locale: "en-US" });

for (const mobile of [true, false]) {
  for (const mode of ["login", "register"] as const) {
    for (const kind of ["terms", "privacy"] as const) {
      test(`${mobile ? "mobile" : "desktop"} ${mode}: ${kind} returns to its auth origin`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: mobile ? 390 : 1440, height: 900 });
        await page.goto(`/auth/${mode}`);
        const form = mobile ? page.getByRole("main") : page.getByRole("dialog");
        await form.locator(`a[href="/${kind}?from=${mode}"]`).click();
        await expect(page).toHaveURL(new RegExp(`/${kind}\\?from=${mode}$`));
        const back = page.getByRole("link", {
          name: mode === "login" ? "Back to sign in" : "Back to create account",
          exact: true,
        });
        await expect(back).toHaveAttribute(
          "href",
          mobile ? `/auth/${mode}` : `/?auth=${mode}`
        );
        const navigatedPaths: string[] = [];
        page.on("framenavigated", (frame) => {
          if (frame === page.mainFrame())
            navigatedPaths.push(new URL(frame.url()).pathname);
        });
        await back.click();
        await expect(form.locator("#auth-email")).toBeVisible();
        if (mobile) {
          await expect(page).toHaveURL(new RegExp(`/auth/${mode}$`));
          await expect(page.getByRole("dialog")).toHaveCount(0);
        } else {
          await expect(page).toHaveURL(new RegExp(`/\\?auth=${mode}$`));
          expect(navigatedPaths).not.toContain(`/auth/${mode}`);
        }
      });
    }
  }
}

for (const path of [
  "/terms",
  "/privacy",
  "/terms?from=unknown",
  "/privacy?from=https://example.com",
]) {
  test(`legal page ${path}: defaults to home`, async ({ page }) => {
    await page.goto(path);
    await expect(
      page.getByRole("link", { name: "Back to home", exact: true })
    ).toHaveAttribute("href", "/");
  });
}

test("switching legal documents preserves the auth origin", async ({ page }) => {
  await page.goto("/terms?from=register");
  await page.locator('a[href="/privacy?from=register"]').click();
  await expect(
    page.getByRole("link", { name: "Back to create account", exact: true })
  ).toHaveAttribute("href", "/?auth=register");
});

test("desktop legal return paints the landing page with the modal already open", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/privacy?from=login");
  const back = page.getByRole("link", { name: "Back to sign in", exact: true });
  await expect(back).toHaveAttribute("href", "/?auth=login");
  await page.evaluate(() => {
    const state = window as typeof window & { authReturnFrames: boolean[] };
    state.authReturnFrames = [];
    const sample = () => {
      if (document.querySelector('[data-testid="landing-topbar"]')) {
        state.authReturnFrames.push(Boolean(document.querySelector("dialog[open]")));
      }
      if (state.authReturnFrames.length < 5) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await back.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { authReturnFrames: boolean[] }).authReturnFrames
            .length
      )
    )
    .toBe(5);
  const frames = await page.evaluate(
    () => (window as typeof window & { authReturnFrames: boolean[] }).authReturnFrames
  );
  expect(frames).toEqual([true, true, true, true, true]);
});
