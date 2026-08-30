import { test, expect } from '@playwright/test';

const APP_ORIGIN = 'http://localhost:3100';
const SESSION_COOKIE = 'sb-localhost-auth-token';

const fakeUser = {
  id: 'user-settings-test',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'settings@example.com',
  app_metadata: { provider: 'google' },
  user_metadata: { full_name: 'Settings Test User' },
};

function fakeJwt() {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: fakeUser.id,
    aud: 'authenticated',
    role: 'authenticated',
    exp: now + 7200,
    iat: now,
    email: fakeUser.email,
  })}.fakesignature`;
}

async function seedAuth(context: { addCookies: (cookies: { name: string; value: string; url: string }[]) => Promise<void> }) {
  const session = {
    access_token: fakeJwt(),
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'fake-refresh-token',
    user: fakeUser,
  };
  const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
  await context.addCookies([{ name: SESSION_COOKIE, value, url: APP_ORIGIN }]);
}

test.describe('Account Settings Page UI', () => {
  test('Google OAuth badge meets WCAG AA text contrast', async ({ page, context }) => {
    await seedAuth(context);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/settings');

    const badge = page.getByText('Google OAuth', { exact: true });
    const colors = await badge.evaluate((element) => {
      const parse = (value: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d')!;
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
        return [red, green, blue, alpha / 255];
      };
      const layers: number[][] = [];
      for (let current: Element | null = element; current; current = current.parentElement) {
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
        [255, 255, 255, 1],
      );
      return {
        foreground: `rgb(${parse(getComputedStyle(element).color).slice(0, 3).join(', ')})`,
        background: `rgb(${background.slice(0, 3).join(', ')})`,
      };
    });

    const parseRgb = (value: string) =>
      value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const luminance = (value: string) => {
      const channels = parseRgb(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const lighter = Math.max(luminance(colors.foreground), luminance(colors.background));
    const darker = Math.min(luminance(colors.foreground), luminance(colors.background));

    expect(
      (lighter + 0.05) / (darker + 0.05),
      `foreground ${colors.foreground}, composited background ${colors.background}`,
    ).toBeGreaterThanOrEqual(4.5);
  });

  test('should render settings page container and account sections', async ({ page, context }) => {
    await seedAuth(context);
    await page.goto('/settings');

    await expect(page.locator('main')).toBeVisible();

    const backLink = page.getByRole('link', { name: /back|กลับ/i });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/dashboard');
    await expect(backLink).toHaveClass(/mb-5/);

    const mainHeading = page.locator('h1, h2, header').first();
    await expect(mainHeading).toBeVisible();
  });
});
