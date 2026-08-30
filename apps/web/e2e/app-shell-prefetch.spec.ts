import { expect, test } from "@playwright/test";

const SESSION_COOKIE = "sb-localhost-auth-token";

async function seedAuth(context: {
  addCookies: (cookies: { name: string; value: string; url: string }[]) => Promise<void>;
}, appOrigin: string) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: "user-prefetch-test",
    aud: "authenticated",
    role: "authenticated",
    email: "prefetch@example.com",
    app_metadata: { provider: "google" },
    user_metadata: { full_name: "Prefetch Test User" },
  };
  const accessToken = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: user.id,
    aud: user.aud,
    role: user.role,
    exp: now + 7200,
    iat: now,
    email: user.email,
  })}.fakesignature`;
  const session = {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: "fake-refresh-token",
    user,
  };
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  await context.addCookies([{ name: SESSION_COOKIE, value, url: appOrigin }]);
}

test("app shell does not duplicate destination prefetches on initial load", async ({ context, page }) => {
  await seedAuth(context, new URL(test.info().project.use.baseURL!).origin);
  const routeRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.searchParams.has("_rsc") && ["/history", "/settings"].includes(url.pathname)) {
      routeRequests.push(url.pathname);
    }
  });

  await page.goto("/dashboard");
  await page.waitForTimeout(500);

  expect(routeRequests.filter((path) => path === "/history").length).toBeLessThanOrEqual(1);
  expect(routeRequests.filter((path) => path === "/settings").length).toBeLessThanOrEqual(1);
});
