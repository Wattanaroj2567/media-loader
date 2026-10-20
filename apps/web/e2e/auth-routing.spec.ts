import { test, expect } from "@playwright/test";
import { mockEmptyJobs } from "./support/mock-empty-jobs";

test.use({ locale: "en-US", trace: "off", screenshot: "off" });

test.describe("Authentication routing", () => {
  test.beforeEach(async ({ page }) => {
    await mockEmptyJobs(page);
  });

  test("protects private pages while allowing public link entry", async ({ page }) => {
    for (const path of ["/dashboard", "/history", "/settings"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("textbox").first()).toBeVisible();
    }
  });

  for (const next of [
    undefined,
    "/history",
    "https://example.org",
    "//example.org",
    "/\\example.org",
    "/auth/signout",
    "/auth/callback",
    "/unknown",
    "/dashboard?code=discarded#discarded",
  ]) {
    test(`callback limits destination ${next ?? "default"}`, async ({
      context,
      baseURL,
    }) => {
      await context.addCookies([
        {
          name: "sb-localhost-auth-token-code-verifier",
          value: `base64-${Buffer.from(JSON.stringify("test-verifier")).toString("base64url")}`,
          url: baseURL!,
        },
      ]);
      const query = new URLSearchParams({ code: "mock-code" });
      if (next) query.set("next", next);
      const response = await context.request.get(`${baseURL}/auth/callback?${query}`, {
        maxRedirects: 0,
      });
      const destination = new URL(response.headers().location);
      expect(destination.origin).toBe(new URL(baseURL!).origin);
      expect(destination.pathname).toBe(
        next === "/history" ? "/history" : "/dashboard"
      );
      expect(destination.search).toBe("");
      expect(destination.hash).toBe("");
    });
  }

  test("callback failures expose only a safe error code", async ({ page }) => {
    await page.goto("/auth/callback?error_description=provider-private-detail");
    await expect(page.locator("form [role=alert]")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("provider-private-detail");
    expect(page.url()).not.toContain("provider-private-detail");
  });

  test("failed exchanges keep a safe callback error visible with an existing session", async ({
    page,
    context,
    baseURL,
  }) => {
    await page.goto("/auth/login");
    await page.getByLabel("Email", { exact: true }).fill("tester@example.com");
    await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await context.addCookies([
      {
        name: "sb-localhost-auth-token-code-verifier",
        value: `base64-${Buffer.from(JSON.stringify("test-verifier")).toString("base64url")}`,
        url: baseURL!,
      },
    ]);
    await page.goto(
      "/auth/callback?code=invalid-code&error_description=private-fixture"
    );
    await expect(page).toHaveURL(/\/auth\/login\?error=callback$/);
    await expect(page.locator("form [role=alert]")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("private-fixture");
    await page.goto("/auth/callback?next=/auth/reset-password");
    await expect(page).toHaveURL(/\/auth\/reset-password\?error=callback$/);
    await expect(page.locator("form [role=alert]")).toBeVisible();
  });

  test("session removal cookies survive the protected-page redirect", async ({
    context,
    baseURL,
  }) => {
    await context.addCookies([
      {
        name: "sb-localhost-auth-token",
        value: `base64-${Buffer.from(
          JSON.stringify({
            access_token: `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: "user-test-1", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.expired-fixture`,
            refresh_token: "mock-refresh-token",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: { id: "user-test-1" },
          })
        ).toString("base64url")}`,
        url: baseURL!,
      },
    ]);
    const response = await context.request.get("/history?private=discarded", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location, baseURL).pathname).toBe("/");
    expect(new URL(response.headers().location, baseURL).search).toBe("");
    expect(response.headers()["set-cookie"]).toContain("Max-Age=0");
    expect(
      (await context.cookies()).some(
        (cookie) => cookie.name === "sb-localhost-auth-token"
      )
    ).toBe(false);
  });

  test("login session redirects auth entry pages and logout protects private pages", async ({
    page,
    context,
  }) => {
    await page.goto("/auth/login");
    await page.getByLabel("Email", { exact: true }).fill("tester@example.com");
    await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    for (const path of [
      "/",
      "/auth/login",
      "/auth/register",
      "/auth/forgot-password",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/dashboard$/);
    }
    const response = await context.request.post("/auth/signout", { maxRedirects: 0 });
    expect(response.status()).toBe(303);
    expect(new URL(response.headers().location).pathname).toBe("/");
    expect(response.headers()["set-cookie"]).toContain("Max-Age=0");
    expect(
      (await context.cookies()).some(
        (cookie) => cookie.name === "sb-localhost-auth-token"
      )
    ).toBe(false);
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/history");
    await expect(page).toHaveURL(/\/$/);
  });
});
