import { expect, test } from "@playwright/test";

test.describe("Privacy and terms pages", () => {
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
    await expect(footer.getByRole("link", { name: "GitHub" })).not.toHaveAttribute(
      "target",
      "_blank"
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
    await expect(contactForm.locator('select[name="topic"]')).toHaveValue("privacy");
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
    const requestType = contactForm.locator('select[name="requestType"]');
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
    const loginFieldStyles = await page.locator("#auth-email").evaluate((element) => {
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
      const panel = element.closest("section")?.parentElement;
      if (!(panel instanceof HTMLElement)) return null;
      const styles = getComputedStyle(panel);
      return {
        color: styles.borderTopColor,
        radius: styles.borderTopLeftRadius,
        width: styles.borderTopWidth,
      };
    });
    await page.locator("#auth-email").focus();
    await page.waitForTimeout(200);
    const loginFocusState = await page.locator("#auth-email").evaluate((element) => ({
      active: document.activeElement === element,
      focus: element.matches(":focus"),
      focusVisible: element.matches(":focus-visible"),
      border: getComputedStyle(element).borderTopColor,
    }));
    expect(contactFieldStyles).toEqual(loginFieldStyles);
    expect(contactPanelBorder).toEqual(loginPanelBorder);
    expect(contactFocusState.active).toBe(true);
    expect(contactFocusState.focus).toBe(true);
    expect(contactFocusState.focusVisible).toBe(true);
    expect(contactFocusState.border).toBe(loginFocusState.border);
    await page.goto("/contact?topic=account");
    await expect(contactForm.locator('select[name="topic"]')).toHaveValue("account");
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

    const topicSelect = contactForm.locator('select[name="topic"]');
    await topicSelect.selectOption("privacy");
    await expect(requestType).toBeVisible();
    await expect(requestType).toHaveAttribute("required", "");
    await expect(requestType).toContainText(
      /Access or copy my data|ขอดูหรือขอสำเนาข้อมูล/i
    );
    await contactForm
      .getByRole("button", { name: /Open email app to send|เปิดแอปอีเมลเพื่อส่ง/i })
      .click();
    await expect(requestType).toHaveAttribute("aria-invalid", "true");
    await expect(contactForm.getByRole("alert")).toContainText(
      /Choose what you would like|กรุณาเลือกสิ่งที่ต้องการ/i
    );
    await expect(requestType).toBeFocused();
    await requestType.selectOption("deletion");
    await expect(requestType).toHaveAttribute("aria-invalid", "false");
    await expect(contactForm.getByRole("alert")).toHaveCount(0);
    await topicSelect.selectOption("account");
    await expect(requestType).toHaveCount(0);

    await page.goto("/terms");
    await expect(page.getByTestId("contact-form")).toHaveCount(0);
    const rightsContactLink = page.getByRole("link", {
      name: /Contact form for terms or media rights|แบบฟอร์มติดต่อเรื่องข้อกำหนดหรือสิทธิ์การใช้สื่อ/i,
    });
    await expect(rightsContactLink).toHaveAttribute("href", "/contact?topic=rights");
    await rightsContactLink.click();
    await expect(page).toHaveURL(/\/contact\?topic=rights$/);
    await expect(contactForm.locator('select[name="topic"]')).toHaveValue("rights");

    await page.goto("/terms");
    const privacyRequestLink = page.getByRole("link", {
      name: /Contact form for personal data requests|แบบฟอร์มติดต่อเรื่องข้อมูลส่วนบุคคล/i,
    });
    await expect(privacyRequestLink).toHaveAttribute("href", "/contact?topic=privacy");
    await privacyRequestLink.click();
    await expect(page).toHaveURL(/\/contact\?topic=privacy$/);
    await expect(contactForm.locator('select[name="topic"]')).toHaveValue("privacy");
  });

  test("contact page fits a narrow mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/contact?topic=privacy");

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByTestId("contact-form")).toBeVisible();
    await expect(
      page.getByTestId("contact-form").locator('select[name="topic"]')
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
