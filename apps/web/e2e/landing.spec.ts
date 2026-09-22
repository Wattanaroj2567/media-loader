import { test, expect } from "@playwright/test";

test.describe("Landing Page & Brand UI", () => {
  test.use({ locale: "th-TH" });

  test("should detect English from a new visitor browser preference", async ({
    browser,
  }) => {
    const baseURL = String(test.info().project.use.baseURL);
    const context = await browser.newContext({ locale: "en-US" });
    const page = await context.newPage();

    await page.goto(baseURL);

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByText("Instant Download · No Login Required")).toBeVisible();
    await context.close();
  });

  test("should prefer a saved language choice over browser detection", async ({
    browser,
  }) => {
    const baseURL = String(test.info().project.use.baseURL);
    const context = await browser.newContext({ locale: "en-US" });
    await context.addCookies([
      {
        name: "media-loader-locale",
        value: "th",
        url: new URL(baseURL).origin,
      },
    ]);
    const page = await context.newPage();

    await page.goto(baseURL);

    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    await expect(
      page.getByText("ดาวน์โหลดได้ทันที โดยไม่ต้องเข้าสู่ระบบ")
    ).toBeVisible();
    await context.close();
  });

  test("should render main hero title and Google login button", async ({ page }) => {
    await page.goto("/");

    // 1. Assert main heading is rendered and visible
    const heroHeading = page.locator("h1");
    await expect(heroHeading).toBeVisible();
    await expect(heroHeading).not.toBeEmpty();

    // 2. Assert Google OAuth login button exists and is enabled
    const loginButton = page
      .getByRole("button", { name: /sign in|เข้าสู่ระบบ|google/i })
      .first();
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toBeEnabled();

    // 3. Assert assurances / policy features exist
    const mainContainer = page.locator("main");
    await expect(mainContainer).toBeVisible();
  });

  test("should use a lightweight reduced-motion-safe hero animation", async ({
    page,
  }) => {
    await page.goto("/");

    const ambientMotion = page.getByTestId("hero-ambient-motion");
    await expect(ambientMotion).toBeVisible();

    const animation = await ambientMotion.evaluate((element) => {
      const rings = Array.from(element.children);
      return {
        heavyElements: element.querySelectorAll("canvas, video").length,
        names: rings.map((ring) => getComputedStyle(ring).animationName),
      };
    });
    expect(animation.heavyElements).toBe(0);
    expect(animation.names).toEqual([
      "hero-orbit-clockwise",
      "hero-orbit-counter-clockwise",
    ]);

    await page.emulateMedia({ reducedMotion: "reduce" });
    const reducedDuration = await ambientMotion
      .locator(".hero-ambient-ring")
      .first()
      .evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).animationDuration)
      );
    expect(reducedDuration).toBeLessThanOrEqual(0.001);
  });

  test("should translate the compact mobile login label", async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 858 });
    await page.goto("/");

    const topbar = page.getByTestId("landing-topbar");
    const instantBadge = page.getByText("ดาวน์โหลดได้ทันที โดยไม่ต้องเข้าสู่ระบบ");
    const loginButton = page
      .getByRole("button", { name: /เข้าสู่ระบบ|google/i })
      .first();
    await expect(topbar).toBeVisible();
    await expect(instantBadge).toBeVisible();
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toContainText("เข้าสู่ระบบ");
    await expect(loginButton).not.toContainText("Login");

    const topbarShape = await topbar.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        contentRight: Math.round(document.body.getBoundingClientRect().right),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        radius: Number.parseFloat(getComputedStyle(element).borderTopLeftRadius),
      };
    });
    expect(topbarShape.left).toBe(0);
    expect(topbarShape.right).toBe(topbarShape.contentRight);
    expect(topbarShape.radius).toBe(0);
  });

  test("should keep the landing topbar attached to the viewport edge while scrolling", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/");

    const topbar = page.getByTestId("landing-topbar");
    await expect(topbar).toBeVisible();
    expect(
      Math.round(
        await topbar.evaluate((element) => element.getBoundingClientRect().top)
      )
    ).toBe(0);

    await page.evaluate(() => window.scrollTo(0, 600));
    await expect
      .poll(() =>
        topbar.evaluate((element) => Math.round(element.getBoundingClientRect().top))
      )
      .toBe(0);
    await expect(topbar).toBeVisible();
  });

  test("should match the signed-in topbar height on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    const topbar = page.getByTestId("landing-topbar");
    await expect(topbar).toBeVisible();
    await expect
      .poll(() => topbar.evaluate((element) => element.getBoundingClientRect().height))
      .toBe(58);
    const desktopShape = await topbar.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        width: Math.round(rect.width),
        radius: Number.parseFloat(getComputedStyle(element).borderTopLeftRadius),
      };
    });
    expect(desktopShape.width).toBeLessThan(1280);
    expect(desktopShape.radius).toBeGreaterThan(20);
  });

  test("should not clip the mobile platform badges at the viewport edges", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 400, height: 700 });
    await page.goto("/");

    const badges = page.getByTestId("platform-quick-badges");
    await badges.scrollIntoViewIfNeeded();
    await expect(badges).toBeVisible();
    await expect(badges.getByText("Instagram", { exact: true })).toBeVisible();
    await expect(badges.getByText("Facebook", { exact: true })).toBeVisible();
    await expect(badges.getByText("Giphy", { exact: true })).toBeVisible();
    await expect(badges.getByText("GIF", { exact: true })).toBeVisible();

    await expect(page.getByTestId("platform-badge-list")).toHaveCSS(
      "justify-content",
      "center"
    );

    const clippedElements = await badges.locator("*").evaluateAll((elements) =>
      elements.flatMap((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return [];
        if (rect.left >= -0.5 && rect.right <= window.innerWidth + 0.5) return [];
        return [
          {
            text: element.textContent?.trim() ?? "",
            left: rect.left,
            right: rect.right,
          },
        ];
      })
    );

    expect(clippedElements).toEqual([]);

    await expect(page.getByTestId("platform-format-separator")).toBeHidden();
    await expect(page.getByTestId("platform-output-formats")).toBeVisible();
  });

  test("should render 4-step workflow indicator card", async ({ page }) => {
    await page.goto("/");

    // Assert the 4 step indicators exist ("01", "02", "03", "04")
    const stepOne = page.getByText("01").first();
    await expect(stepOne).toBeVisible();

    const stepFour = page.getByText("04").first();
    await expect(stepFour).toBeVisible();
  });

  test("should render clear row and column dividers in desktop tables", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    for (const testId of ["workflow-table", "platform-table"]) {
      const table = page.getByTestId(testId);
      await expect(table).toBeVisible();

      const borders = await table.evaluate((element) => {
        const headerCell = element.querySelector("th");
        const bodyCell = element.querySelector("td");
        if (!headerCell || !bodyCell) throw new Error("Expected table cells");

        return {
          headerBottom: getComputedStyle(headerCell).borderBottomWidth,
          headerRight: getComputedStyle(headerCell).borderRightWidth,
          rowBottom: getComputedStyle(bodyCell).borderBottomWidth,
          rowRight: getComputedStyle(bodyCell).borderRightWidth,
        };
      });

      expect(borders).toEqual({
        headerBottom: "1px",
        headerRight: "1px",
        rowBottom: "1px",
        rowRight: "1px",
      });
    }
  });

  test("should keep desktop tables display-only", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    for (const testId of ["workflow-table", "platform-table"]) {
      const table = page.getByTestId(testId);
      await expect(table).toBeVisible();
      await expect(
        table.locator(
          'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).toHaveCount(0);

      const firstRow = table.locator("tbody tr").first();
      const backgroundBeforeHover = await firstRow.evaluate(
        (element) => getComputedStyle(element).backgroundColor
      );
      await firstRow.hover();
      await expect
        .poll(() =>
          firstRow.evaluate((element) => getComputedStyle(element).backgroundColor)
        )
        .toBe(backgroundBeforeHover);
    }
  });

  test("should keep assurance cards display-only", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    const cards = page.getByTestId("assurance-card");
    await expect(cards).toHaveCount(3);

    const firstCard = cards.first();
    const appearanceBeforeHover = await firstCard.evaluate((element) => {
      const icon = element.querySelector("div > div");
      const text = element.querySelector("p");
      if (!icon || !text) throw new Error("Expected assurance card content");

      return {
        background: getComputedStyle(element).backgroundColor,
        border: getComputedStyle(element).borderColor,
        iconBackground: getComputedStyle(icon).backgroundColor,
        text: getComputedStyle(text).color,
      };
    });

    await firstCard.hover();
    await expect
      .poll(() =>
        firstCard.evaluate((element) => {
          const icon = element.querySelector("div > div");
          const text = element.querySelector("p");
          if (!icon || !text) throw new Error("Expected assurance card content");

          return {
            background: getComputedStyle(element).backgroundColor,
            border: getComputedStyle(element).borderColor,
            iconBackground: getComputedStyle(icon).backgroundColor,
            text: getComputedStyle(text).color,
          };
        })
      )
      .toEqual(appearanceBeforeHover);
  });

  test("should present GIF as a dedicated capability instead of mixing output formats", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    const table = page.getByTestId("platform-table");
    await expect(table.getByRole("columnheader", { name: /^GIF$/i })).toBeVisible();
    await expect(
      table.getByRole("columnheader", { name: /output formats|รูปแบบไฟล์/i })
    ).toHaveCount(0);

    const giphyRow = table.getByRole("row").filter({ hasText: "Giphy" });
    await expect(giphyRow).toBeVisible();
    await expect(giphyRow).toContainText(/original gif|gif ต้นฉบับ/i);
  });

  test("should separate MP4, MP3, and GIF capabilities on mobile cards", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 400, height: 800 });
    await page.goto("/");

    const giphyCard = page.getByTestId("platform-card-giphy");
    await giphyCard.scrollIntoViewIfNeeded();
    await expect(giphyCard).toBeVisible();
    await expect(giphyCard.getByText("MP4", { exact: true })).toBeVisible();
    await expect(giphyCard.getByText("MP3", { exact: true })).toBeVisible();
    await expect(giphyCard.getByText("GIF", { exact: true })).toBeVisible();
    await expect(giphyCard).toContainText(/original gif|gif ต้นฉบับ/i);
  });

  test("should keep the downloader before the workflow and platform sections", async ({
    page,
  }) => {
    await page.goto("/");

    const downloaderInput = page.getByRole("textbox", {
      name: /วางลิงก์คลิป|วางลิงก์วิดีโอหรือเสียง|paste a clip link|paste a video url/i,
    });
    const workflowHeading = page.getByRole("heading", {
      name: /ขั้นตอนการดาวน์โหลด|workflow built for real use/i,
    });
    const platformHeading = page.getByRole("heading", {
      name: /ตารางเปรียบเทียบการรองรับแต่ละแพลตฟอร์ม|platform capabilities & format support/i,
    });

    await expect(downloaderInput).toBeVisible();
    await expect(workflowHeading).toBeVisible();
    await expect(platformHeading).toBeVisible();

    const order = await page.evaluate(
      ({ input, workflow, platform }) =>
        Boolean(
          input.compareDocumentPosition(workflow) & Node.DOCUMENT_POSITION_FOLLOWING &&
          input.compareDocumentPosition(platform) & Node.DOCUMENT_POSITION_FOLLOWING &&
          workflow.compareDocumentPosition(platform) & Node.DOCUMENT_POSITION_FOLLOWING
        ),
      {
        input: await downloaderInput.elementHandle(),
        workflow: await workflowHeading.elementHandle(),
        platform: await platformHeading.elementHandle(),
      }
    );

    expect(order).toBe(true);
  });

  test("should place trust assurances after platform capabilities", async ({
    page,
  }) => {
    await page.goto("/");

    const platformSection = page.getByTestId("platform-capabilities-section");
    const assurancesSection = page.getByTestId("assurances-section");

    await expect(platformSection).toBeVisible();
    await expect(assurancesSection).toBeVisible();

    const order = await page.evaluate(
      ({ platform, assurances }) =>
        Boolean(
          platform.compareDocumentPosition(assurances) &
          Node.DOCUMENT_POSITION_FOLLOWING
        ),
      {
        platform: await platformSection.elementHandle(),
        assurances: await assurancesSection.elementHandle(),
      }
    );

    expect(order).toBe(true);
  });

  test("should list supported X, Bilibili, and VK platforms with YouTube 4K support", async ({
    page,
  }) => {
    await page.goto("/");

    const platformSection = page.getByTestId("platform-capabilities-section");
    await expect(platformSection).toContainText("X");
    await expect(platformSection).toContainText("Bilibili");
    await expect(platformSection).toContainText("VK Video");
    await expect(platformSection).toContainText(/4K|2160p/i);
  });

  test("should load and apply IBM Plex Sans Thai", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const fontFamily = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily
    );
    expect(fontFamily.toLowerCase()).toContain("ibm");
  });
});
