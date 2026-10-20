import { test, expect } from "@playwright/test";
import { mockEmptyJobs } from "./support/mock-empty-jobs";

test.use({ locale: "en-US", trace: "off", screenshot: "off" });

test.beforeEach(async ({ page }) => {
  await mockEmptyJobs(page);
});

test("password visibility preserves input and never submits the login form", async ({
  page,
}) => {
  let authRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/auth/v1/token")) authRequests++;
  });
  await page.goto("/auth/login");
  const password = page.getByLabel("Password", { exact: true });
  await expect(
    page.getByRole("button", { name: "Show password", exact: true })
  ).toBeDisabled();
  await password.fill("Visibility-fixture-123");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(password).toHaveAttribute("type", "text");
  await password.fill("");
  await expect(
    page.getByRole("button", { name: /^(Show|Hide) password$/ })
  ).toBeDisabled();
  await expect(password).toHaveAttribute("type", "password");
  await password.fill("Visibility-fixture-123");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(password).toHaveValue("Visibility-fixture-123");
  const hide = page.getByRole("button", { name: "Hide password", exact: true });
  await expect(hide).toHaveAttribute("aria-pressed", "true");
  await hide.press("Space");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password", exact: true }).press("Enter");
  await expect(password).toHaveAttribute("type", "text");
  await expect(page.locator("form [role=alert]")).toHaveCount(0);
  expect(authRequests).toBe(0);
  await expect(page).toHaveURL(/\/auth\/login$/);
});

test("registration password and confirmation visibility are independent", async ({
  page,
}) => {
  await page.goto("/auth/register");
  const password = page.getByLabel("Password", { exact: true });
  const confirmation = page.getByLabel("Confirm password", { exact: true });
  await password.fill("Visibility-fixture-123");
  await confirmation.fill("Visibility-fixture-123");
  await page
    .getByRole("button", { name: "Show password confirmation", exact: true })
    .click();
  await expect(confirmation).toHaveAttribute("type", "text");
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await page
    .getByRole("button", { name: "Hide password confirmation", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(confirmation).toHaveAttribute("type", "password");
  await expect(confirmation).toHaveValue("Visibility-fixture-123");
});

test("login validates email and password before contacting auth", async ({ page }) => {
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/auth/v1/token")) requests++;
  });
  await page.goto("/auth/login");
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("#auth-email-error")).toHaveText("Enter your email.");
  await page.getByLabel("Email", { exact: true }).fill("invalid");
  await page.getByLabel("Password", { exact: true }).fill("Fixture-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("#auth-email-error")).toContainText("Enter your email.");
  expect(requests).toBe(0);
});

for (const [email, expected] of [
  ["invalid@example.com", "Email or password is incorrect."],
  ["unconfirmed@example.com", "Confirm your email before signing in."],
  ["rate@example.com", "Too many attempts."],
]) {
  test(`login shows a safe error for ${email}`, async ({ page }) => {
    const logs: string[] = [];
    page.on("console", (event) => logs.push(event.text()));
    await page.goto("/auth/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("Fixture-password-123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator("form [role=alert]")).toContainText(expected);
    await expect(page.locator("body")).not.toContainText("mock-sensitive-marker");
    expect(logs.join(" ")).not.toContain("mock-sensitive-marker");
    expect(logs.join(" ")).not.toContain("Fixture-password-123");
  });
}

test("valid email login enters dashboard with a durable session", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByLabel("Email", { exact: true }).fill("tester@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Fixture-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("registration validates passwords and sends optional display name metadata", async ({
  page,
}) => {
  await page.goto("/auth/register");
  await page.getByLabel("Email", { exact: true }).fill("new@example.com");
  await page.getByLabel("Display name (optional)").fill("Fixture Member");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByLabel("Confirm password", { exact: true }).fill("different");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.locator("#auth-password-error")).toContainText(
    "at least 8 characters"
  );
  await page.getByLabel("Password", { exact: true }).fill("Fixture-password-123");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.locator("#auth-confirm-status")).toContainText(
    "Passwords do not match"
  );
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("Fixture-password-123");
  await page.clock.install();
  // Observe only non-secret registration metadata at the public HTTP boundary.
  const signup = page.waitForRequest((request) =>
    request.url().includes("/auth/v1/signup")
  );
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  const request = await signup;
  const { data } = request.postDataJSON();
  expect(data).toEqual({ full_name: "Fixture Member", language: "en" });
  await expect(page.locator("form [role=status]")).toContainText("Check your email");
  await expect(page).toHaveURL(/\/auth\/register$/);
  await expect(
    page.getByRole("heading", { name: "Check your email", exact: true })
  ).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Resend in/ })).toBeDisabled();
  await page.screenshot({ path: "test-results/signup-confirmation.png" });
  await page.clock.runFor(61_000);
  const resend = page.getByRole("button", {
    name: "Resend confirmation email",
    exact: true,
  });
  await expect(resend).toBeEnabled();
  const resendRequest = page.waitForRequest((request) =>
    request.url().includes("/auth/v1/resend")
  );
  await resend.click();
  const resendPayload = (await resendRequest).postDataJSON();
  expect(resendPayload.type).toBe("signup");
  expect(resendPayload.email).toBe("new@example.com");
  await expect(page.locator("form [role=status]")).toContainText(
    "awaiting confirmation"
  );
  await expect(page.getByRole("button", { name: /Resend in/ })).toBeDisabled();
  await page
    .getByRole("button", { name: "Edit registration email", exact: true })
    .click();
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
});

test("registration with an immediate session enters dashboard", async ({ page }) => {
  await page.goto("/auth/register");
  await page.getByLabel("Email", { exact: true }).fill("confirmed@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Fixture-password-123");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("Fixture-password-123");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

for (const email of ["tester@example.com", "unknown@example.com", "rate@example.com"]) {
  test(`forgot password is neutral for ${email}`, async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await page.getByLabel("Email", { exact: true }).fill(email);
    const requestPromise = page.waitForRequest((request) =>
      request.url().includes("/auth/v1/recover")
    );
    await page.getByRole("button", { name: "Send reset link" }).click();
    const request = await requestPromise;
    expect(new URL(request.url()).searchParams.get("redirect_to")).toBe(
      "http://localhost:3100/auth/callback?next=/auth/reset-password"
    );
    await expect(page.locator("form [role=status]")).toHaveText(
      "Reset email request sent. If an account exists for this email, we'll send a link. Check your inbox and spam folder."
    );
    await expect(page.locator("form [role=alert]")).toHaveCount(0);
  });
}

test("reset password requires a verified session", async ({ page }) => {
  await page.goto("/auth/reset-password");
  await expect(page.locator("form [role=alert]")).toContainText("invalid or expired");
  await expect(page.getByRole("button", { name: "Save new password" })).toBeDisabled();
});

test("recovery session updates password and signs out before login", async ({
  context,
  page,
}) => {
  await context.addCookies([
    {
      name: "sb-localhost-auth-token-code-verifier",
      value: `base64-${Buffer.from(JSON.stringify("test-verifier")).toString("base64url")}`,
      url: "http://localhost:3100",
    },
  ]);
  await page.goto("/auth/callback?code=mock-code&next=/auth/reset-password");
  await expect(page).toHaveURL(/\/auth\/reset-password$/);
  await expect(page.getByLabel("New password", { exact: true })).toBeEnabled();
  await page
    .getByLabel("New password", { exact: true })
    .fill("Fixture-new-password-123");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("Fixture-new-password-123");
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "PUT" && request.url().endsWith("/auth/v1/user"))
      requests.push("update");
    if (request.url().includes("/auth/v1/logout")) requests.push("logout");
  });
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/\/auth\/login\?reset=success$/);
  await expect(page.locator("form [role=status]")).toContainText("Password updated");
  expect(requests).toEqual(["update", "logout"]);
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/");
});

test("Google initiation preserves callback and errors stay safe", async ({ page }) => {
  await page.goto("/auth/login");
  await page.route("**/auth/v1/authorize?**", (route) =>
    route.fulfill({ contentType: "text/html", body: "Mock Google consent" })
  );
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page).toHaveURL(/\/auth\/v1\/authorize/);
  expect(new URL(page.url()).searchParams.get("redirect_to")).toBe(
    "http://localhost:3100/auth/callback"
  );
  await page.goto("/auth/login?error=mock-sensitive-marker");
  await expect(page.locator("form [role=alert]")).toHaveText(
    "Google sign-in failed. Please try again."
  );
  await expect(page.locator("body")).not.toContainText("mock-sensitive-marker");
});

test("Thai auth labels and public link entry stay available", async ({
  context,
  page,
}) => {
  await context.addCookies([
    { name: "media-loader-locale", value: "th", url: "http://localhost:3100" },
  ]);
  await page.goto("/auth/login");
  await expect(
    page.getByRole("heading", { name: "เข้าสู่ระบบ", exact: true })
  ).toBeVisible();
  await expect(page.getByLabel("อีเมล", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "แสดงรหัสผ่าน", exact: true })
  ).toBeDisabled();
  await page.getByRole("link", { name: "กลับไปหน้าวางลิงก์" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("textbox", { name: /วางลิงก์คลิป/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "สมัครสมาชิก" })).toHaveCount(0);
});

test("reset retries signout without repeating a successful password update", async ({
  context,
  page,
}) => {
  await context.addCookies([
    {
      name: "sb-localhost-auth-token-code-verifier",
      value: `base64-${Buffer.from(JSON.stringify("test-verifier")).toString("base64url")}`,
      url: "http://localhost:3100",
    },
  ]);
  await page.goto("/auth/callback?code=mock-code&next=/auth/reset-password");
  await expect(page.getByLabel("New password", { exact: true })).toBeEnabled();
  await page
    .getByLabel("New password", { exact: true })
    .fill("Fixture-new-password-123");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("Fixture-new-password-123");
  let updates = 0;
  let logouts = 0;
  page.on("request", (request) => {
    if (request.method() === "PUT" && request.url().endsWith("/auth/v1/user"))
      updates++;
  });
  await page.route("**/auth/v1/logout?**", async (route) => {
    logouts++;
    if (logouts === 1)
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error_code: "unexpected_failure",
          message: "Fixture failure",
        }),
      });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.locator("form [role=alert]")).toContainText("Password updated");
  await expect(page.getByLabel("New password", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("New password", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Finish signing out" }).click();
  await expect(page).toHaveURL(/\/auth\/login\?reset=success$/);
  expect(updates).toBe(1);
  expect(logouts).toBe(2);
});
