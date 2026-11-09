import { expect, test } from "@playwright/test";

test("mobile information pages offer a back-to-top control after scrolling", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 500 },
    locale: "en-US",
    reducedMotion: "reduce",
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    for (const path of ["/privacy", "/terms", "/how-it-works", "/contact"]) {
      await page.goto(new URL(path, baseURL).href);
      const button = page.getByRole("button", { name: "Back to top" });
      await expect(button).toHaveCount(0);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(button).toBeVisible();
      await button.tap();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await expect(button).toHaveCount(0);
    }
  } finally {
    await context.close();
  }
});

test.describe("Privacy and terms pages", () => {
  test("desktop back link stays pinned when scrolling through the final sections", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 659 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setExtraHTTPHeaders({ "Accept-Language": "th" });
    for (const kind of ["privacy", "terms"]) {
      await page.goto(`/${kind}`);
      const aside = page.locator("aside");
      const links = aside.locator("div nav a");
      await expect
        .poll(() =>
          aside.locator(":scope > div").evaluate((element) => ({
            overflow: getComputedStyle(element).overflowY,
            clipped: element.scrollHeight > element.clientHeight,
          }))
        )
        .toEqual({ overflow: "visible", clipped: false });
      const count = await links.count();
      for (const index of [count - 2, count - 1]) {
        await links.nth(index).click();
        await page.evaluate(() =>
          window.scrollTo(0, document.documentElement.scrollHeight)
        );
        await expect
          .poll(() => aside.evaluate((element) => element.getBoundingClientRect().top))
          .toBeCloseTo(48, 0);
        await expect(aside.locator(":scope > a")).toBeInViewport();
        await expect(links.last()).toBeInViewport();
      }
      const footer = page.getByTestId("site-footer");
      await expect(footer).toBeInViewport();
      await expect
        .poll(() =>
          aside.evaluate((element) => {
            const footerNav = document.querySelector('[data-testid="site-footer"] nav');
            if (!footerNav) return false;
            const sidebar = element.getBoundingClientRect();
            const footer = footerNav.getBoundingClientRect();
            return sidebar.right <= footer.left || sidebar.bottom <= footer.top;
          })
        )
        .toBe(true);
    }
  });

  test("contents selection stays on the clicked section after smooth scrolling", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const kind of ["privacy", "terms"]) {
      await page.goto(`/${kind}`);
      const contents = page.locator("aside > div nav");
      const sectionsCount = await contents.locator("a").count();
      for (const number of [1, 4, 2, sectionsCount, sectionsCount - 1, 1]) {
        const link = contents.locator(`a[href="#${kind}-section-${number}"]`);
        await link.click();
        await expect(link).toHaveAttribute("aria-current", "location");
        await expect
          .poll(() =>
            page.locator(`#${kind}-section-${number}`).evaluate((section) => {
              const margin = parseFloat(getComputedStyle(section).scrollMarginTop);
              const target = Math.min(
                window.scrollY + section.getBoundingClientRect().top - margin,
                document.documentElement.scrollHeight - window.innerHeight
              );
              return Math.abs(window.scrollY - target);
            })
          )
          .toBeLessThanOrEqual(2);
        // Sample subsequent frames so an optimistic click state cannot pass alone.
        await page.evaluate(
          () =>
            new Promise<void>((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            })
        );
        await expect(link).toHaveAttribute("aria-current", "location");
        await expect
          .poll(() =>
            contents.evaluate((nav) => {
              const indicator = nav.querySelector('[aria-hidden="true"]');
              const active = nav.querySelector('[aria-current="location"]');
              if (!indicator || !active) return Infinity;
              const pill = indicator.getBoundingClientRect();
              const item = active.getBoundingClientRect();
              return Math.max(
                Math.abs(pill.top - item.top),
                Math.abs(pill.height - item.height)
              );
            })
          )
          .toBeLessThanOrEqual(1);
      }
      await page.mouse.move(1100, 500);
      await page.mouse.click(1100, 500);
      await page.mouse.wheel(0, 700);
      await expect(contents.locator('a[href$="-section-1"]')).not.toHaveAttribute(
        "aria-current",
        "location"
      );
      await page.keyboard.press("Control+End");
      await expect
        .poll(() =>
          page.evaluate(() =>
            Math.abs(
              document.documentElement.scrollHeight -
                window.innerHeight -
                window.scrollY
            )
          )
        )
        .toBeLessThanOrEqual(1);
      await expect(contents.locator("a").last()).toHaveAttribute(
        "aria-current",
        "location"
      );
      await page.keyboard.press("Control+Home");
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await expect(contents.locator('a[href$="-section-1"]')).toHaveAttribute(
        "aria-current",
        "location"
      );
    }
  });

  test("theme menu switches the page between light and dark", async ({ page }) => {
    await page.goto("/");

    const themeButton = page.locator('button[aria-haspopup="true"]');
    await themeButton.click();
    await page.getByRole("button", { name: "Light" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.goto("/privacy");
    await expect(page.locator("main > header")).toHaveCount(0);
    const lightBackground = await page
      .locator("main")
      .evaluate((element) => getComputedStyle(element).backgroundColor);

    await page.goto("/");
    await expect(themeButton).toBeVisible();
    await themeButton.click();
    await page.getByRole("button", { name: "Dark" }).click();
    await page.goto("/privacy");
    await expect(page.locator("html")).toHaveClass(/dark/);
    const darkBackground = await page
      .locator("main")
      .evaluate((element) => getComputedStyle(element).backgroundColor);

    expect(darkBackground).not.toBe(lightBackground);
  });

  test("footer links open the matching pages", async ({ page }) => {
    await page.goto("/");

    const footer = page.getByTestId("site-footer");
    await expect(footer.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/Wattanaroj2567/media-loader"
    );
    await expect(
      footer.getByRole("link", { name: "GitHub" }).locator("svg")
    ).toBeVisible();
    await expect(
      footer.locator("nav").getByRole("link", { name: "GitHub" })
    ).toHaveCount(0);
    await expect(footer.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "target",
      "_blank"
    );
    await expect(footer.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "rel",
      "noopener noreferrer"
    );
    await footer.locator('a[href="/privacy"]').click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.locator("h1")).toBeVisible();

    await page.getByTestId("site-footer").locator('a[href="/terms"]').click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(page.locator("h1")).toBeVisible();

    await page.getByTestId("site-footer").locator('a[href="/contact"]').click();
    await expect(page).toHaveURL(/\/contact$/);
    await expect(
      page.getByRole("heading", { name: /Contact Media Loader|ติดต่อ Media Loader/i })
    ).toBeVisible();
    await expect(page.getByTestId("contact-form")).toBeVisible();

    await page.goto("/");
    await page.getByTestId("site-footer").locator('a[href="/how-it-works"]').click();
    await expect(page).toHaveURL(/\/how-it-works$/);
    await expect(page.getByTestId("how-it-works-steps").locator("article")).toHaveCount(
      3
    );
    await expect(
      page.getByRole("heading", { name: /File delivery steps|ขั้นตอนการส่งไฟล์/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Frequently asked questions|คำถามที่พบบ่อย/i })
    ).toBeVisible();
    await expect(
      page.getByText(
        /Is the file downloaded to my device twice|ไฟล์ถูกดาวน์โหลดลงอุปกรณ์ของฉันสองครั้ง/i
      )
    ).toBeVisible();
  });

  test("privacy and terms update dates appear below the title only", async ({
    page,
  }) => {
    const updateDatePattern =
      /Last updated: 20 October 2026|ปรับปรุงล่าสุด: 20 ตุลาคม 2569/;
    const pages = [
      {
        path: "/privacy",
        changesHeading: /Changes to this notice|การเปลี่ยนแปลงประกาศ/i,
        explanation: /We may update this notice|เราอาจปรับปรุงประกาศ/i,
      },
      {
        path: "/terms",
        changesHeading: /Changes to these terms|การเปลี่ยนแปลงข้อกำหนด/i,
        explanation: /We may update these terms|เราอาจปรับปรุงข้อกำหนด/i,
      },
    ];

    for (const { path, changesHeading, explanation } of pages) {
      await page.goto(path);

      const updateDate = page.getByTestId("legal-last-updated");
      await expect(updateDate).toHaveText(updateDatePattern);
      await expect(
        updateDate.locator("xpath=ancestor::header[1]").locator("h1")
      ).toBeVisible();

      const changesSection = page
        .getByRole("heading", { name: changesHeading })
        .locator("xpath=ancestor::section[1]");
      await expect(changesSection).toContainText(explanation);
      await expect(changesSection).not.toContainText(/20 October 2026|20 ตุลาคม 2569/);
      await expect(page.getByText(updateDatePattern)).toHaveCount(1);
    }
  });

  test("contact forms prepare the right email and route privacy requests", async ({
    page,
  }) => {
    await page.goto("/privacy");

    const privacyContact = page.locator("#privacy-section-1");
    await expect(page.getByTestId("contact-form")).toHaveCount(0);
    await expect(
      privacyContact.getByRole("link", {
        name: /Open the contact form for personal data requests|เปิดแบบฟอร์มติดต่อเรื่องข้อมูลส่วนบุคคล/i,
      })
    ).toHaveAttribute("href", "/contact?topic=privacy");
    await expect(
      privacyContact.getByRole("link", { name: "tawan.wattanaroth@gmail.com" })
    ).toHaveAttribute("href", "mailto:tawan.wattanaroth@gmail.com");
    await privacyContact
      .getByRole("link", {
        name: /Open the contact form for personal data requests|เปิดแบบฟอร์มติดต่อเรื่องข้อมูลส่วนบุคคล/i,
      })
      .click();
    await expect(page).toHaveURL(/\/contact\?topic=privacy$/);

    const contactForm = page.getByTestId("contact-form");
    await expect(contactForm).toBeVisible();
    await expect(contactForm).toHaveAttribute("novalidate", "");
    await expect(contactForm.locator('input[name="topic"]')).toHaveValue("privacy");
    await expect(
      contactForm.getByLabel(/Reply email|อีเมลสำหรับติดต่อกลับ/i)
    ).toBeVisible();
    await expect(
      contactForm.getByLabel(/Error message or job ID|ข้อความแจ้งเตือนหรือรหัสงาน/i)
    ).toBeVisible();
    await expect(
      contactForm.getByPlaceholder(/“Analysis failed”|“วิเคราะห์ไม่สำเร็จ”/i)
    ).toBeVisible();
    const detailsField = contactForm.getByLabel(/^Details$|รายละเอียด/i);
    await expect(detailsField).toHaveAttribute("required", "");
    await expect(contactForm).toContainText(
      /Do not include passwords|อย่าส่งรหัสผ่าน/i
    );
    const requestType = contactForm.getByRole("combobox", {
      name: /What would you like us to do|ต้องการจัดการข้อมูลอย่างไร/i,
    });
    await expect(requestType).toBeVisible();

    const contactPanelBorder = await contactForm.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        color: styles.borderTopColor,
        radius: styles.borderTopLeftRadius,
        width: styles.borderTopWidth,
      };
    });
    const contactEmail = contactForm.getByLabel(/Reply email|อีเมลสำหรับติดต่อกลับ/i);
    const contactFieldStyles = await contactEmail.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        backgroundColor: styles.backgroundColor,
        borderRadius: styles.borderRadius,
        borderTopColor: styles.borderTopColor,
        borderTopWidth: styles.borderTopWidth,
        fontSize: styles.fontSize,
        height: styles.height,
        paddingLeft: styles.paddingLeft,
        paddingRight: styles.paddingRight,
      };
    });
    await contactEmail.focus();
    await page.waitForTimeout(200);
    const contactFocusState = await contactEmail.evaluate((element) => ({
      active: document.activeElement === element,
      focus: element.matches(":focus"),
      focusVisible: element.matches(":focus-visible"),
      border: getComputedStyle(element).borderTopColor,
    }));
    await page.goto("/auth/login");
    const loginEmail = page.getByRole("dialog").locator("#auth-email");
    await expect(loginEmail).toBeVisible();
    await loginEmail.evaluate(async (element) => {
      element.blur();
      await Promise.all(
        element
          .getAnimations()
          .map((animation) => animation.finished.catch(() => undefined))
      );
    });
    const loginFieldStyles = await loginEmail.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        backgroundColor: styles.backgroundColor,
        borderRadius: styles.borderRadius,
        borderTopColor: styles.borderTopColor,
        borderTopWidth: styles.borderTopWidth,
        fontSize: styles.fontSize,
        height: styles.height,
        paddingLeft: styles.paddingLeft,
        paddingRight: styles.paddingRight,
      };
    });
    const loginPanelBorder = await page.locator("#auth-title").evaluate((element) => {
      const panel = element.closest("dialog");
      if (!(panel instanceof HTMLElement)) return null;
      const styles = getComputedStyle(panel);
      return {
        color: styles.borderTopColor,
        radius: styles.borderTopLeftRadius,
        width: styles.borderTopWidth,
      };
    });
    await loginEmail.focus();
    await loginEmail.evaluate(async (element) => {
      await Promise.all(
        element
          .getAnimations()
          .map((animation) => animation.finished.catch(() => undefined))
      );
    });
    const loginFocusState = await loginEmail.evaluate((element) => ({
      active: document.activeElement === element,
      focus: element.matches(":focus"),
      focusVisible: element.matches(":focus-visible"),
      border: getComputedStyle(element).borderTopColor,
    }));
    // Modal fields use the compact height; their shared field styling stays consistent.
    expect(contactFieldStyles).toEqual({ ...loginFieldStyles, height: "44px" });
    expect(loginFieldStyles.height).toBe("42px");
    expect(contactPanelBorder).toMatchObject({ radius: "18px", width: "1px" });
    expect(loginPanelBorder).toMatchObject({ radius: "16px", width: "1px" });
    expect(contactFocusState.active).toBe(true);
    expect(contactFocusState.focus).toBe(true);
    expect(contactFocusState.focusVisible).toBe(true);
    expect(loginFocusState.active).toBe(true);
    expect(loginFocusState.focus).toBe(true);
    expect(loginFocusState.focusVisible).toBe(true);
    expect(contactFocusState.border).toBe(loginFocusState.border);
    await page.goto("/contact?topic=account");
    await expect(contactForm.locator('input[name="topic"]')).toHaveValue("account");
    await expect(requestType).toHaveCount(0);

    await contactForm
      .getByRole("button", { name: /Open email app to send|เปิดแอปอีเมลเพื่อส่ง/i })
      .click();
    await expect(detailsField).toHaveAttribute("aria-invalid", "true");
    await expect(contactForm.getByRole("alert")).toContainText(
      /Please enter the details|กรุณากรอกรายละเอียด/i
    );
    await expect(detailsField).toBeFocused();
    await detailsField.fill("I need help with my account.");
    await expect(contactForm.getByRole("alert")).toHaveCount(0);

    const replyEmailField = contactForm.getByLabel(
      /Reply email|อีเมลสำหรับติดต่อกลับ/i
    );
    await replyEmailField.fill("not-an-email");
    await contactForm
      .getByRole("button", { name: /Open email app to send|เปิดแอปอีเมลเพื่อส่ง/i })
      .click();
    await expect(replyEmailField).toHaveAttribute("aria-invalid", "true");
    await expect(contactForm.getByRole("alert")).toContainText(
      /Enter an email address|กรุณาตรวจรูปแบบอีเมล/i
    );
    await expect(replyEmailField).toBeFocused();
    await replyEmailField.fill("person@example.com");
    await expect(contactForm.getByRole("alert")).toHaveCount(0);

    const topicTrigger = contactForm.getByRole("combobox", {
      name: /What is this about|เรื่องที่ต้องการติดต่อ/i,
    });
    await topicTrigger.click();
    await page
      .getByRole("option", {
        name: /Personal data request|คำขอเกี่ยวกับข้อมูลส่วนบุคคล/i,
      })
      .click();
    await expect(requestType).toBeVisible();
    await contactForm
      .getByRole("button", { name: /Open email app to send|เปิดแอปอีเมลเพื่อส่ง/i })
      .click();
    await expect(requestType).toHaveAttribute("aria-invalid", "true");
    await expect(contactForm.getByRole("alert")).toContainText(
      /Choose what you would like|กรุณาเลือกสิ่งที่ต้องการ/i
    );
    await expect(requestType).toBeFocused();
    await requestType.click();
    await page.getByRole("option", { name: /Delete my data|ลบข้อมูล/i }).click();
    await expect(requestType).toHaveAttribute("aria-invalid", "false");
    await expect(contactForm.getByRole("alert")).toHaveCount(0);
    await topicTrigger.click();
    await page
      .getByRole("option", { name: /Account or usage|บัญชีหรือการใช้งาน/i })
      .click();
    await expect(requestType).toHaveCount(0);

    await page.goto("/terms");
    await expect(page.getByTestId("contact-form")).toHaveCount(0);
    const rightsContactLink = page.getByRole("link", {
      name: /Contact form for terms or media rights|แบบฟอร์มติดต่อเรื่องข้อกำหนดหรือสิทธิ์การใช้สื่อ/i,
    });
    await expect(rightsContactLink).toHaveAttribute("href", "/contact?topic=rights");
    await rightsContactLink.click();
    await expect(page).toHaveURL(/\/contact\?topic=rights$/);
    await expect(contactForm.locator('input[name="topic"]')).toHaveValue("rights");

    await page.goto("/terms");
    const privacyRequestLink = page.getByRole("link", {
      name: /Contact form for personal data requests|แบบฟอร์มติดต่อเรื่องข้อมูลส่วนบุคคล/i,
    });
    await expect(privacyRequestLink).toHaveAttribute("href", "/contact?topic=privacy");
    await privacyRequestLink.click();
    await expect(page).toHaveURL(/\/contact\?topic=privacy$/);
    await expect(contactForm.locator('input[name="topic"]')).toHaveValue("privacy");
  });

  test("contact page fits a narrow mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/contact?topic=privacy");

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByTestId("contact-form")).toBeVisible();
    await expect(
      page.getByTestId("contact-form").locator('input[name="topic"]')
    ).toHaveValue("privacy");
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(375);
  });

  test("workflow explanation is readable on a narrow mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/how-it-works");

    const backLink = page.getByRole("link", { name: /กลับหน้าหลัก|back to home/i });
    await expect(backLink).toBeVisible();
    await expect(backLink.locator("svg.lucide-arrow-left")).toBeVisible();
    const stepCards = page.getByTestId("how-it-works-steps").locator("article");
    await expect(stepCards).toHaveCount(3);
    for (const [index, stepCard] of (await stepCards.all()).entries()) {
      await expect(stepCard.locator("h3")).toHaveText(new RegExp(`^${index + 1}\\. `));
      await expect(stepCard.locator("span")).toHaveCount(0);
      await expect(stepCard.locator("svg")).toHaveCount(1);
    }
    const qaCards = page.getByTestId("how-it-works-qa");
    await expect(qaCards).toHaveCount(9);
    await expect(
      page.getByRole("heading", { name: /Frequently asked questions|คำถามที่พบบ่อย/i })
    ).toBeVisible();
    for (const qaCard of await qaCards.all()) {
      await expect(qaCard).not.toHaveAttribute("open", "");
      const summary = qaCard.locator("summary");
      await expect(summary).toBeVisible();
      await summary.click();
      await expect(qaCard).toHaveAttribute("open", "");
      await expect(qaCard.locator("p")).toBeVisible();
      await summary.click();
      await expect(qaCard).not.toHaveAttribute("open", "");
      await expect(qaCard.locator("p")).toBeHidden();
    }
    await expect(qaCards.locator("svg")).toHaveCount(27);
    await expect(page.locator("h1")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Frequently asked questions|คำถามที่พบบ่อย/i })
    ).toBeVisible();
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(375);
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
