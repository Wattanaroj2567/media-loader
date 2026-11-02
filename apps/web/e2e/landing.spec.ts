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
      page.getByRole("heading", {
        name: "Download video and audio from supported public links",
      })
    ).toBeVisible();
    await expect(
      page.getByText(
        "Choose MP4 video quality or extract MP3 audio when a clip has audio. GIF is supported only when the system detects GIF media."
      )
    ).toBeVisible();
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
    await expect(
      page.getByRole("heading", {
        name: "ดาวน์โหลดวิดีโอและเสียงจากลิงก์สาธารณะที่รองรับ",
      })
    ).toBeVisible();
    await expect(
      page.getByText(
        "เลือกคุณภาพวิดีโอ MP4 หรือแยกเสียง MP3 ได้เมื่อคลิปมีเสียง ส่วน GIF รองรับเฉพาะสื่อ GIF ที่ระบบตรวจพบ"
      )
    ).toBeVisible();
    await expect(page.getByText("คิวงานและประวัติในบัญชีของคุณ")).toBeVisible();
    await context.close();
  });

  test("should show simple format summaries and hide technical conversion details", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    const section = page.getByTestId("conversion-codec-details");
    await expect(
      section.getByText(
        "สร้าง MP4 ที่เปิดได้กับอุปกรณ์ทั่วไป และคงข้อมูลภาพเดิมไว้เมื่อทำได้"
      )
    ).toBeVisible();
    await expect(
      section.getByText(
        "แยกเสียงเป็น MP3 โดยเน้นคุณภาพเสียงสูง ขนาดไฟล์ขึ้นอยู่กับเสียงต้นฉบับ"
      )
    ).toBeVisible();
    await expect(
      section.getByText("สร้าง GIF สูงสุด 15 ภาพต่อวินาที และกว้างไม่เกิน 960 พิกเซล")
    ).toBeVisible();

    const cards = section.locator("article");
    const collapsedCardHeights = await cards.evaluateAll((cards) =>
      cards.map((card) => card.getBoundingClientRect().height)
    );
    expect(
      Math.max(...collapsedCardHeights) - Math.min(...collapsedCardHeights)
    ).toBeLessThanOrEqual(1);
    const detailsTops = await cards.evaluateAll((cards) =>
      cards.map((card) => card.querySelector("details")!.getBoundingClientRect().top)
    );
    expect(Math.max(...detailsTops) - Math.min(...detailsTops)).toBeLessThanOrEqual(1);
    const detailsMargins = await cards.evaluateAll((cards) =>
      cards.map((card) => getComputedStyle(card.querySelector("details")!).marginTop)
    );
    expect(detailsMargins).toEqual(["12px", "12px", "12px"]);

    const mp4Details = section.locator("details").first();
    const mp4Summary = mp4Details.locator("summary");
    const summaryDocumentTop = () =>
      mp4Summary.evaluate(
        (summary) => summary.getBoundingClientRect().top + window.scrollY
      );
    const summaryTopBeforeToggle = await summaryDocumentTop();
    await expect(mp4Details.locator("code")).toBeHidden();
    await mp4Summary.click();
    await expect(mp4Details.locator("code")).toHaveText(
      "H.264 (libx264) + AAC · 320 kb/s"
    );
    expect(
      Math.abs((await summaryDocumentTop()) - summaryTopBeforeToggle)
    ).toBeLessThanOrEqual(1);
    const expandedCardHeights = await cards.evaluateAll((cards) =>
      cards.map((card) => card.getBoundingClientRect().height)
    );
    expect(expandedCardHeights[0]).toBeGreaterThan(collapsedCardHeights[0]);
    expect(expandedCardHeights[1]).toBeLessThanOrEqual(collapsedCardHeights[1] + 1);
    expect(expandedCardHeights[2]).toBeLessThanOrEqual(collapsedCardHeights[2] + 1);
    await mp4Summary.click();
    await expect(mp4Details.locator("code")).toBeHidden();
    expect(
      Math.abs((await summaryDocumentTop()) - summaryTopBeforeToggle)
    ).toBeLessThanOrEqual(1);
  });

  test("should provide only the back-to-top button", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const backToTop = page.getByRole("button", { name: "กลับขึ้นด้านบน" });
    await expect(backToTop).toBeHidden();
    await expect(
      page.getByRole("button", { name: "ไปยังส่วน", exact: true })
    ).toHaveCount(0);

    await page.getByTestId("conversion-codec-details").scrollIntoViewIfNeeded();
    await expect(backToTop).toBeVisible();
    await backToTop.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(1);
    await expect(backToTop).toBeHidden();
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
    await page.evaluate(() => window.scrollTo(0, 150));
    await expect
      .poll(() => topbar.evaluate((element) => element.getBoundingClientRect().height))
      .toBe(58);
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
    await expect(badges.getByText("Tenor", { exact: true })).toBeVisible();
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
    const videoPlatformIds = [
      "youtube",
      "tiktok",
      "instagram",
      "facebook",
      "x",
      "bilibili",
      "vk",
    ];
    const gifPlatformIds = ["giphy", "tenor"];

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const mobilePlatformCard = page.getByTestId("platform-card-youtube");
    await expect(mobilePlatformCard).toBeVisible();
    await expect(
      mobilePlatformCard.getByRole("heading", { name: "YouTube" })
    ).toBeVisible();

    for (const platformId of videoPlatformIds) {
      await expect(
        page.getByTestId(`platform-card-${platformId}`).locator("span.rounded-full")
      ).toHaveCount(0);
    }
    for (const platformId of gifPlatformIds) {
      await expect(
        page.getByTestId(`gif-platform-card-${platformId}`).locator("span.rounded-full")
      ).toHaveCount(0);
    }

    await page.setViewportSize({ width: 1280, height: 900 });
    const comparisonTable = page.getByRole("table").nth(1);
    await expect(comparisonTable).toBeVisible();
    await expect(comparisonTable.getByRole("row").nth(1)).toContainText("YouTube");

    for (let rowIndex = 1; rowIndex <= videoPlatformIds.length; rowIndex += 1) {
      await expect(
        comparisonTable
          .getByRole("row")
          .nth(rowIndex)
          .getByRole("cell")
          .first()
          .locator("span.rounded-full")
      ).toHaveCount(0);
    }

    const gifTable = page.getByTestId("gif-platform-table");
    await expect(gifTable.getByRole("row")).toHaveCount(gifPlatformIds.length + 1);
    await expect(gifTable.getByRole("row").nth(1)).toContainText("Giphy");
    await expect(gifTable.getByRole("row").nth(2)).toContainText("Tenor");
  });

  test("should render the full six-step workflow", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    const workflowTable = page.getByTestId("workflow-table");
    const workflowRows = workflowTable.locator("tbody tr");
    await expect(workflowRows).toHaveCount(6);
    await expect(workflowTable.locator("thead th").first()).toHaveCSS(
      "text-align",
      "center"
    );
    await expect(workflowRows.first().locator("td").first()).toHaveText("1");
    await expect(workflowRows.first().locator("td").first()).toHaveCSS(
      "text-align",
      "center"
    );
    await expect(workflowRows.nth(1).locator("td").first()).toHaveText("2");
    await expect(workflowRows.nth(3)).toContainText(/เซิร์ฟเวอร์|server/i);
    await expect(workflowRows.nth(5)).toContainText(/เบราว์เซอร์|browser/i);
    await expect(
      page.getByText(/ไม่ได้ถูกดาวน์โหลดลงเครื่องซ้ำ|does not download the file twice/i)
    ).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileSteps = page.getByTestId("workflow-mobile-steps");
    const firstMobileNumber = mobileSteps
      .locator(":scope > div")
      .first()
      .locator("span");
    await expect(firstMobileNumber).toHaveText("1");
    await expect(firstMobileNumber).toHaveCSS("text-align", "center");
    await expect(mobileSteps.locator(":scope > div").nth(5).locator("span")).toHaveText(
      "6"
    );
  });

  test("should render clear row and column dividers in desktop tables", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    for (const testId of ["workflow-table", "platform-table", "gif-platform-table"]) {
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
      platformTable.getByRole("columnheader", { name: /cover|ภาพปก/i })
    ).toHaveCount(0);
    await expect(
      platformTable.getByRole("columnheader", { name: /preview|ตัวอย่าง/i })
    ).toHaveCount(0);
    await expect(
      platformTable.getByRole("columnheader", { name: /^fps$/i })
    ).toHaveCount(0);
    await expect(platformTable.getByRole("columnheader")).toHaveCount(5);
    await expect(
      platformTable.getByTestId("platform-details-button-youtube")
    ).toHaveAttribute("aria-expanded", "false");
    await platformTable.getByTestId("platform-details-button-youtube").click();
    const youtubeDetails = platformTable.getByTestId("platform-details-youtube");
    await expect(youtubeDetails).toContainText(/cover|ภาพปก/i);
    await expect(youtubeDetails).toContainText(/preview|ตัวอย่าง/i);
    await expect(youtubeDetails).toContainText(/FPS/i);
    await expect(youtubeDetails).not.toContainText(/360p|25 FPS|ผลจากลิงก์ตัวอย่าง/i);

    await platformTable.getByTestId("platform-details-button-youtube").click();
    await page.setViewportSize({ width: 390, height: 844 });
    const youtubeCard = page.getByTestId("platform-card-youtube");
    await expect(youtubeCard).toBeVisible();
    await expect(youtubeCard.getByText(/^(วิดีโอ|Video)$/i)).toBeVisible();
    await expect(youtubeCard.getByText(/^(เสียง|Audio)$/i)).toBeVisible();
    await expect(youtubeCard.getByText(/^GIF$/i)).toBeVisible();
    await expect(youtubeCard.getByText(/^(ภาพปก|Cover)$/i)).toHaveCount(0);
    await expect(youtubeCard.getByText(/^(ตัวอย่าง|Preview)$/i)).toHaveCount(0);
    await expect(youtubeCard.getByText(/^FPS$/i)).toHaveCount(0);

    await youtubeCard.getByTestId("platform-details-button-youtube").click();
    const mobileYoutubeDetails = youtubeCard.getByTestId("platform-details-youtube");
    await expect(mobileYoutubeDetails).toContainText(/ภาพปก|cover/i);
    await expect(mobileYoutubeDetails).toContainText(/ตัวอย่าง|preview/i);
    await expect(mobileYoutubeDetails).toContainText(/FPS/i);
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

  test("should separate video platforms from Giphy and Tenor GIF sources", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    const videoGroup = page.getByTestId("video-platforms-group");
    const table = videoGroup.getByTestId("platform-table");
    const gifGroup = page.getByTestId("gif-platforms-group");
    const gifTable = gifGroup.getByTestId("gif-platform-table");
    const tableTopMargins = await Promise.all(
      [table, gifTable].map((table) =>
        table
          .locator("xpath=..")
          .evaluate((wrapper) => getComputedStyle(wrapper).marginTop)
      )
    );
    expect(tableTopMargins).toEqual(["12px", "12px"]);
    await expect(
      videoGroup.getByRole("heading", {
        name: /video-media platforms|แพลตฟอร์มสื่อวิดีโอ/i,
      })
    ).toBeVisible();
    await expect(
      gifGroup.getByRole("heading", { name: /GIF platforms|แพลตฟอร์ม GIF/i })
    ).toBeVisible();
    await expect(table.getByRole("columnheader", { name: /GIF/i })).toBeVisible();
    await expect(
      table.getByRole("columnheader", { name: /output formats|รูปแบบไฟล์/i })
    ).toHaveCount(0);
    await expect(table.getByRole("row").filter({ hasText: "Giphy" })).toHaveCount(0);
    await expect(table.getByRole("row").filter({ hasText: "Tenor" })).toHaveCount(0);

    const giphyRow = gifTable.getByRole("row").filter({ hasText: "Giphy" });
    await expect(giphyRow).toBeVisible();
    await giphyRow.getByTestId("gif-platform-details-button-giphy").click();
    await expect(gifTable.getByTestId("gif-platform-details-giphy")).toContainText(
      /original gif|gif ต้นฉบับ/i
    );

    const tenorRow = gifTable.getByRole("row").filter({ hasText: "Tenor" });
    await expect(tenorRow).toBeVisible();
    await tenorRow.getByTestId("gif-platform-details-button-tenor").click();
    await expect(gifTable.getByTestId("gif-platform-details-tenor")).toContainText(
      /analyze \.gif|วิเคราะห์ลิงก์ \.gif/i
    );
    await page.setViewportSize({ width: 1280, height: 1400 });
    await page
      .getByTestId("platform-capabilities-section")
      .screenshot({ path: "test-results/platform-table-readable.png" });
  });

  test("should show GIF services in a separate mobile card group", async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 });
    await page.goto("/");

    const gifGroup = page.getByTestId("gif-platforms-group");
    const giphyCard = page.getByTestId("gif-platform-card-giphy");
    const tenorCard = page.getByTestId("gif-platform-card-tenor");
    const videoCards = page.getByTestId("platform-card-youtube").locator("xpath=..");
    const gifCards = giphyCard.locator("xpath=..");
    await gifGroup.scrollIntoViewIfNeeded();
    await expect(giphyCard).toBeVisible();
    await expect(tenorCard).toBeVisible();
    const cardGroupTopMargins = await Promise.all(
      [videoCards, gifCards].map((cards) =>
        cards.evaluate((element) => getComputedStyle(element).marginTop)
      )
    );
    expect(cardGroupTopMargins).toEqual(["12px", "12px"]);
    await expect(page.getByTestId("platform-card-giphy")).toHaveCount(0);
    await expect(page.getByTestId("platform-card-tenor")).toHaveCount(0);
    await expect(giphyCard.getByText(/^(ไฟล์ GIF|GIF file)$/)).toBeVisible();
    await expect(giphyCard.getByText(/^(เสียง|Audio)$/)).toBeVisible();
    await giphyCard.getByTestId("gif-platform-details-button-giphy").click();
    await expect(giphyCard.getByTestId("gif-platform-details-giphy")).toContainText(
      /original gif|gif ต้นฉบับ/i
    );
    await tenorCard.getByTestId("gif-platform-details-button-tenor").click();
    await expect(tenorCard.getByTestId("gif-platform-details-tenor")).toContainText(
      /analyze \.gif|วิเคราะห์ลิงก์ \.gif/i
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

  test("should describe source-dependent capabilities for X, Bilibili, and VK", async ({
    page,
  }) => {
    await page.goto("/");

    const platformSection = page.getByTestId("platform-capabilities-section");
    const platformTable = platformSection.getByTestId("platform-table");
    await expect(platformSection).toContainText("X");
    await expect(platformSection).toContainText("Bilibili");
    await expect(platformSection).toContainText("VK Video");
    await expect(platformSection).toContainText(
      /GIF เมื่อพบสื่อ GIF ที่รองรับ|GIF options appear when supported GIF media is detected/i
    );
    await expect(platformSection).toContainText(
      /FPS คืออัตราเฟรมที่ต้นทางรายงาน|FPS is the frame rate reported by the source/i
    );
    await expect(platformSection).not.toContainText(
      /ผลตัวอย่างไม่ใช่การรับประกัน|Sample results do not guarantee/i
    );
    await platformTable.getByTestId("platform-details-button-vk").click();
    const vkDetails = platformTable.getByTestId("platform-details-vk");
    await expect(vkDetails).toContainText(/according to each clip|ตามข้อมูลของคลิป/i);
    await expect(vkDetails).not.toContainText(/1080p.*25 FPS/i);
    await platformTable.getByTestId("platform-details-button-bilibili").click();
    const bilibiliDetails = platformTable.getByTestId("platform-details-bilibili");
    await expect(bilibiliDetails).toContainText(/account and clip|บัญชีและคลิป/i);
    await expect(bilibiliDetails).not.toContainText(/720p.*1080p/i);
    await platformTable.getByTestId("platform-details-button-x").click();
    const xDetails = platformTable.getByTestId("platform-details-x");
    await expect(xDetails).toContainText(/public posts|โพสต์สาธารณะ/i);
    await expect(xDetails).not.toContainText(
      /480p.*no audio track|480p.*ไม่มีแทร็กเสียง/i
    );
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
