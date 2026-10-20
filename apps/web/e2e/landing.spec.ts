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
    await expect(
      page.getByText("Your queue and history, in your account")
    ).toBeVisible();
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
    await expect(page.getByText("คิวงานและประวัติในบัญชีของคุณ")).toBeVisible();
    await context.close();
  });

  test("should open the shared auth modal from the header without a link", async ({
    page,
  }) => {
    await page.goto("/");

    // 1. Assert main heading is rendered and visible
    const heroHeading = page.locator("h1");
    await expect(heroHeading).toBeVisible();
    await expect(heroHeading).not.toBeEmpty();

    // The header uses the same modal as URL submission, even without a URL.
    const loginButton = page
      .getByRole("button", { name: /sign in|เข้าสู่ระบบ/i })
      .first();
    await expect(loginButton).toBeVisible();
    await loginButton.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("dialog", { name: "เข้าสู่ระบบ", exact: true })
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(page.getByRole("status")).toHaveCount(0);
    await page.getByRole("button", { name: "ปิด", exact: true }).click();
    await expect(loginButton).toBeFocused();

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
      const glows = Array.from(element.querySelectorAll(".hero-ambient-glow"));
      return {
        heavyElements: element.querySelectorAll("canvas, video").length,
        names: glows.map((glow) => getComputedStyle(glow).animationName),
      };
    });
    expect(animation.heavyElements).toBe(0);
    expect(animation.names).toEqual(["hero-ambient-drift", "hero-ambient-drift"]);

    await page.emulateMedia({ reducedMotion: "reduce" });
    const reducedAnimation = await ambientMotion
      .locator(".hero-ambient-glow")
      .first()
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(reducedAnimation).toBe("none");
  });

  test("should keep floating brand marks outside hero copy at every screen size", async ({
    page,
  }) => {
    await page.goto("/");
    const decoration = page.getByTestId("hero-platforms");
    await expect(decoration).toHaveAttribute("aria-hidden", "true");
    for (const width of [1440, 1280, 1100, 1024, 768, 390, 360, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const geometry = await decoration.evaluate((element) => {
        const intro = element.parentElement!;
        const copy = [
          intro.querySelector("h1")!,
          intro.querySelector("p")!,
          intro.querySelector(".inline-flex")!,
        ].map((node) => node.getBoundingClientRect());
        const marks = Array.from(element.querySelectorAll("[data-platform]"))
          .filter((node) => node.getBoundingClientRect().width > 0)
          .map((node) => {
            const rect = node.getBoundingClientRect();
            return {
              insideViewport: rect.left >= 0 && rect.right <= innerWidth,
              overlapsCopy: copy.some(
                (text) =>
                  rect.left < text.right &&
                  rect.right > text.left &&
                  rect.top < text.bottom &&
                  rect.bottom > text.top
              ),
              pointerEvents: getComputedStyle(node).pointerEvents,
              animation: getComputedStyle(node).animationName,
            };
          });
        return { marks, overflows: document.documentElement.scrollWidth > innerWidth };
      });
      expect(geometry.overflows, `width ${width}`).toBe(false);
      expect(geometry.marks).toHaveLength(8);
      for (const mark of geometry.marks) {
        expect(mark.insideViewport, `width ${width}`).toBe(true);
        expect(mark.overlapsCopy, `width ${width}`).toBe(false);
        expect(mark.pointerEvents).toBe("none");
        expect(mark.animation).toContain("platform-float");
      }
      if (width === 1440 || width === 390) {
        await page.screenshot({ path: `test-results/hero-platforms-${width}.png` });
      }
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const mark of await decoration.locator("[data-platform]").all()) {
      await expect(mark).toHaveCSS("animation-name", "none");
      const asset = await page.request.get(
        `/platforms/${await mark.getAttribute("data-platform")}.svg`
      );
      expect(asset.ok()).toBe(true);
      expect(await asset.text()).toContain("<svg");
    }
  });

  test("should keep pastes local until an explicit sign-in action", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const analyzedUrls: string[] = [];
    let queuedDownloads = 0;
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/downloads"
      ) {
        queuedDownloads += 1;
      }
    });
    await page.route("**/media/analyze*", async (route) => {
      const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "*",
      };
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers });
        return;
      }
      analyzedUrls.push(route.request().postDataJSON().url);
      await route.fulfill({
        headers,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            policy: { decision: "blocked", reason: "Fixture policy check" },
            media: null,
            formats: [],
          },
          error: null,
        }),
      });
    });
    await page.goto("/");

    const linkInput = page.getByRole("textbox", { name: "วางลิงก์คลิป" });
    const feedback = page.getByTestId("link-paste-feedback");
    await expect(feedback).toHaveCount(0);
    await page.evaluate(() =>
      navigator.clipboard.writeText("https://example.com/first.mp4")
    );
    await linkInput.click();
    await linkInput.press("Control+V");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").press("Escape");
    await expect(linkInput).toHaveValue("https://example.com/first.mp4");
    await expect(feedback).toHaveCount(1);
    expect(analyzedUrls).toHaveLength(0);
    await expect
      .poll(() => feedback.evaluate((element) => getComputedStyle(element).opacity))
      .toBe("0");

    await linkInput.fill("");
    await page.evaluate(() =>
      navigator.clipboard.writeText("https://example.com/second.mp4")
    );
    await page.getByRole("button", { name: "วางลิงก์", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").press("Escape");
    await expect(linkInput).toHaveValue("https://example.com/second.mp4");
    expect(analyzedUrls).toHaveLength(0);

    await expect
      .poll(() => feedback.evaluate((element) => getComputedStyle(element).opacity))
      .toBe("0");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await linkInput.fill("");
    await page.evaluate(() =>
      navigator.clipboard.writeText("https://example.com/third.mp4")
    );
    await page.getByRole("button", { name: "วางลิงก์", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").press("Escape");
    await expect(feedback).toBeHidden();
    expect(analyzedUrls).toHaveLength(0);
    expect(analyzedUrls).toHaveLength(0);
    expect(queuedDownloads).toBe(0);
    await expect(page).toHaveURL(/\/$/);
    await page.getByTestId("url-submit").click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("dialog", { name: "เข้าสู่ระบบ", exact: true })
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText("เก็บลิงก์ไว้แล้ว");
    await page.getByRole("dialog").press("Escape");
    await expect(linkInput).toHaveValue("https://example.com/third.mp4");
    await page.reload();
    await expect(linkInput).toHaveValue("https://example.com/third.mp4");
    expect(analyzedUrls).toHaveLength(0);
  });

  test("should translate the compact mobile login label", async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 858 });
    await page.goto("/");

    const topbar = page.getByTestId("landing-topbar");
    const instantBadge = page.getByText("คิวงานและประวัติในบัญชีของคุณ");
    const loginButton = page.getByRole("button", { name: /เข้าสู่ระบบ/i }).first();
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

  test("should show platform names without redundant colored tags on mobile and desktop", async ({
    page,
  }) => {
    const platformIds = [
      "youtube",
      "tiktok",
      "instagram",
      "facebook",
      "x",
      "bilibili",
      "vk",
      "giphy",
    ];

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const mobilePlatformCard = page.getByTestId("platform-card-youtube");
    await expect(mobilePlatformCard).toBeVisible();
    await expect(
      mobilePlatformCard.getByRole("heading", { name: "YouTube" })
    ).toBeVisible();

    for (const platformId of platformIds) {
      await expect(
        page.getByTestId(`platform-card-${platformId}`).locator("span.rounded-full")
      ).toHaveCount(0);
    }

    await page.setViewportSize({ width: 1280, height: 900 });
    const comparisonTable = page.getByRole("table").nth(1);
    await expect(comparisonTable).toBeVisible();
    await expect(comparisonTable.getByRole("row").nth(1)).toContainText("YouTube");

    for (let rowIndex = 1; rowIndex <= platformIds.length; rowIndex += 1) {
      await expect(
        comparisonTable
          .getByRole("row")
          .nth(rowIndex)
          .getByRole("cell")
          .first()
          .locator("span.rounded-full")
      ).toHaveCount(0);
    }
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

  test("should keep workflow table display-only and expose platform details", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    const workflowTable = page.getByTestId("workflow-table");
    await expect(workflowTable).toBeVisible();
    await expect(
      workflowTable.locator(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).toHaveCount(0);

    const platformTable = page.getByTestId("platform-table");
    await expect(platformTable).toBeVisible();
    await expect(
      platformTable.getByTestId("platform-details-button-youtube")
    ).toHaveAttribute("aria-expanded", "false");
    await platformTable.getByTestId("platform-details-button-youtube").click();
    await expect(platformTable.getByTestId("platform-details-youtube")).toContainText(
      /60 เฟรม|60 frames/i
    );
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
    await expect(table.getByRole("columnheader", { name: /GIF/i })).toBeVisible();
    await expect(
      table.getByRole("columnheader", { name: /output formats|รูปแบบไฟล์/i })
    ).toHaveCount(0);

    const giphyRow = table.getByRole("row").filter({ hasText: "Giphy" });
    await expect(giphyRow).toBeVisible();
    await giphyRow.getByTestId("platform-details-button-giphy").click();
    await expect(table.getByTestId("platform-details-giphy")).toContainText(
      /original gif|gif ต้นฉบับ/i
    );
    await page.setViewportSize({ width: 1280, height: 1400 });
    await page
      .getByTestId("platform-capabilities-section")
      .screenshot({ path: "test-results/platform-table-readable.png" });
  });

  test("should separate MP4, MP3, and GIF capabilities on mobile cards", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 400, height: 800 });
    await page.goto("/");

    const giphyCard = page.getByTestId("platform-card-giphy");
    await giphyCard.scrollIntoViewIfNeeded();
    await expect(giphyCard).toBeVisible();
    await expect(giphyCard.getByText(/^(วิดีโอ|Video)$/)).toBeVisible();
    await expect(giphyCard.getByText(/^(เสียง|Audio)$/)).toBeVisible();
    await expect(giphyCard.getByText("GIF", { exact: true })).toBeVisible();
    await giphyCard.getByTestId("platform-details-button-giphy").click();
    await expect(giphyCard.getByTestId("platform-details-giphy")).toContainText(
      /original gif|gif ต้นฉบับ/i
    );
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
      name: /แต่ละแพลตฟอร์มดาวน์โหลดอะไรได้บ้าง|what can you download from each platform/i,
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
