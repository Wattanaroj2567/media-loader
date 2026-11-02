import { test, expect } from "@playwright/test";
import { mockEmptyJobs } from "./support/mock-empty-jobs";

const APP_ORIGIN = "http://localhost:3100";
const SESSION_COOKIE = "sb-localhost-auth-token";

const fakeUser = {
  id: "user-settings-test",
  aud: "authenticated",
  role: "authenticated",
  email: "settings@example.com",
  app_metadata: { provider: "google" },
  user_metadata: { full_name: "Settings Test User" },
};

function fakeJwt() {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: fakeUser.id,
    aud: "authenticated",
    role: "authenticated",
    exp: now + 7200,
    iat: now,
    email: fakeUser.email,
  })}.fakesignature`;
}

async function seedAuth(context: {
  addCookies: (
    cookies: { name: string; value: string; url: string }[]
  ) => Promise<void>;
}) {
  const session = {
    access_token: fakeJwt(),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "fake-refresh-token",
    user: fakeUser,
  };
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  await context.addCookies([{ name: SESSION_COOKIE, value, url: APP_ORIGIN }]);
}

test.describe("Account Settings Page UI", () => {
  test.beforeEach(async ({ page }) => {
    await mockEmptyJobs(page);
  });

  test("Google OAuth badge meets WCAG AA text contrast", async ({ page, context }) => {
    await seedAuth(context);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/settings");

    const badge = page.getByText("Google OAuth", { exact: true });
    const colors = await badge.evaluate((element) => {
      const parse = (value: string) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d")!;
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
        return [red, green, blue, alpha / 255];
      };
      const layers: number[][] = [];
      for (
        let current: Element | null = element;
        current;
        current = current.parentElement
      ) {
        layers.push(parse(getComputedStyle(current).backgroundColor));
      }
      const background = layers.reverse().reduce(
        (behind, front) => {
          const alpha = front[3] + behind[3] * (1 - front[3]);
          return [
            (front[0] * front[3] + behind[0] * behind[3] * (1 - front[3])) / alpha,
            (front[1] * front[3] + behind[1] * behind[3] * (1 - front[3])) / alpha,
            (front[2] * front[3] + behind[2] * behind[3] * (1 - front[3])) / alpha,
            alpha,
          ];
        },
        [255, 255, 255, 1]
      );
      return {
        foreground: `rgb(${parse(getComputedStyle(element).color).slice(0, 3).join(", ")})`,
        background: `rgb(${background.slice(0, 3).join(", ")})`,
      };
    });

    const parseRgb = (value: string) =>
      value
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
    const luminance = (value: string) => {
      const channels = parseRgb(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const lighter = Math.max(
      luminance(colors.foreground),
      luminance(colors.background)
    );
    const darker = Math.min(luminance(colors.foreground), luminance(colors.background));

    expect(
      (lighter + 0.05) / (darker + 0.05),
      `foreground ${colors.foreground}, composited background ${colors.background}`
    ).toBeGreaterThanOrEqual(4.5);
  });

  test("should render settings page container and account sections", async ({
    page,
    context,
  }) => {
    await seedAuth(context);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/settings");

    await expect(page.locator("main")).toBeVisible();
    const accountContent = page.getByTestId("account-page-content");
    await expect(accountContent).toBeVisible();

    const backLink = page.getByRole("link", { name: /back|กลับ/i });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", "/dashboard");
    await expect(backLink.locator("..")).toHaveCSS("margin-bottom", "24px");
    await expect(backLink.locator("svg.lucide-arrow-left")).toBeVisible();

    const mainHeading = page.locator("h1, h2, header").first();
    await expect(mainHeading).toBeVisible();

    const accountWidth = await accountContent.evaluate(
      (element) => element.getBoundingClientRect().width
    );
    await page.goto("/how-it-works");
    const workflowWidth = await page
      .locator("main")
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(accountWidth).toBe(workflowWidth);
  });

  test("subscribes to push alerts and removes the subscription when disabled", async ({
    page,
    context,
  }) => {
    await seedAuth(context);
    await context.addCookies([
      { name: "media-loader-locale", value: "en", url: APP_ORIGIN },
    ]);
    await page.addInitScript(() => {
      class GrantedNotification {
        static permission: NotificationPermission = "granted";

        static async requestPermission() {
          return "granted" as NotificationPermission;
        }
      }

      Object.defineProperty(window, "Notification", {
        configurable: true,
        value: GrantedNotification,
      });
      Object.defineProperty(window, "PushManager", {
        configurable: true,
        value: class MockPushManager {},
      });

      const subscription = {
        endpoint: "https://fcm.googleapis.com/push/test-subscription",
        toJSON: () => ({
          endpoint: "https://fcm.googleapis.com/push/test-subscription",
          expirationTime: null,
          keys: { p256dh: "A".repeat(87), auth: "B".repeat(22) },
        }),
        unsubscribe: async () => {
          localStorage.setItem("test:push-subscription", "0");
          return true;
        },
      } as unknown as PushSubscription;
      const registration = {
        pushManager: {
          getSubscription: async () =>
            localStorage.getItem("test:push-subscription") === "1"
              ? subscription
              : null,
          subscribe: async () => {
            localStorage.setItem("test:push-subscription", "1");
            return subscription;
          },
        },
      };
      const serviceWorker = {
        register: async () => registration,
        getRegistration: async () => registration,
        ready: Promise.resolve(registration),
      };
      Object.defineProperty(navigator, "serviceWorker", {
        configurable: true,
        value: serviceWorker,
      });
    });

    let savedSubscription: unknown;
    let serverPushEnabled = false;
    let deleteAllRequested = false;
    await page.route("**/notifications/**", async (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Authorization,Content-Type",
          },
        });
        return;
      }
      if (request.url().endsWith("/vapid-public-key")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { public_key: "B".repeat(87) },
            error: null,
          }),
        });
        return;
      }
      if (request.url().endsWith("/subscriptions/status")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            data: { enabled: serverPushEnabled },
            error: null,
          }),
        });
        return;
      }
      if (request.method() === "POST") {
        savedSubscription = request.postDataJSON();
        serverPushEnabled = true;
      } else if (request.method() === "DELETE") {
        deleteAllRequested = !request.postDataJSON().endpoint;
        serverPushEnabled = false;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data:
            request.method() === "DELETE" ? { deleted: true } : { subscribed: true },
          error: null,
        }),
      });
    });

    await page.goto("/settings");

    const notificationSwitch = page.getByRole("switch", {
      name: "Browser notifications",
    });
    await expect(notificationSwitch).toBeVisible();
    await expect(notificationSwitch).toHaveAttribute("aria-checked", "false");
    await notificationSwitch.click();

    await expect(notificationSwitch).toHaveAttribute("aria-checked", "true");
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem("media-loader:browser-notifications"))
      )
      .toBe("1");
    expect(savedSubscription).toEqual({
      endpoint: "https://fcm.googleapis.com/push/test-subscription",
      keys: { p256dh: "A".repeat(87), auth: "B".repeat(22) },
      locale: "en",
    });

    await page.reload();
    const persistedNotificationSwitch = page.getByRole("switch", {
      name: "Browser notifications",
    });
    await expect(persistedNotificationSwitch).toHaveAttribute("aria-checked", "true");
    await persistedNotificationSwitch.click();
    await expect(persistedNotificationSwitch).toHaveAttribute("aria-checked", "false");
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem("media-loader:browser-notifications"))
      )
      .toBe("0");
    expect(deleteAllRequested).toBe(true);
  });

  test("disables account push subscriptions from another app origin", async ({
    page,
    context,
  }) => {
    await seedAuth(context);
    await page.addInitScript(() => {
      class GrantedNotification {
        static permission: NotificationPermission = "granted";
      }

      Object.defineProperty(window, "Notification", {
        configurable: true,
        value: GrantedNotification,
      });
      const registration = {
        pushManager: { getSubscription: async () => null },
      };
      Object.defineProperty(navigator, "serviceWorker", {
        configurable: true,
        value: {
          register: async () => registration,
          getRegistration: async () => registration,
          ready: Promise.resolve(registration),
        },
      });
    });

    let deleteAllRequested = false;
    await page.route("**/notifications/**", async (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204 });
        return;
      }
      if (request.url().endsWith("/subscriptions/status")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, data: { enabled: true }, error: null }),
        });
        return;
      }
      if (request.method() === "DELETE") {
        deleteAllRequested = !request.postDataJSON().endpoint;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, data: { deleted: true }, error: null }),
      });
    });

    await page.goto("/settings");
    const notificationSwitch = page.getByRole("switch", {
      name: "Browser notifications",
    });
    await expect(notificationSwitch).toHaveAttribute("aria-checked", "true");
    await notificationSwitch.click();
    await expect(notificationSwitch).toHaveAttribute("aria-checked", "false");
    expect(deleteAllRequested).toBe(true);
  });
});
