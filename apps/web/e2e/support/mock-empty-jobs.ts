import type { Page } from "@playwright/test";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function mockEmptyJobs(page: Page) {
  await page.route("**/downloads*", async (route) => {
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: true,
        data: { jobs: [], total: 0, limit: 100, offset: 0 },
        error: null,
      }),
    });
  });
}
