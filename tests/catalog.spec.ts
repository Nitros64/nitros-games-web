import { test, expect, type APIRequestContext } from "@playwright/test";

const published = { id: 41, name: "Contract test game", description: "A test-only description", jam: true, developerCount: 2, genreIds: [3], publicationStatus: "PUBLISHED" };
async function scenario(request: APIRequestContext, data: object) {
  const response = await request.post("http://127.0.0.1:3181/scenario", { data });
  expect(response.ok()).toBe(true);
}

test.describe("public catalog over server HTTP", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), "Controlled API requires the isolated test server.");
  test.afterEach(async ({ request }) => { await scenario(request, { body: [] }); });

  test("renders published metadata, escapes text, and reflects unpublication on refresh", async ({ page, request }) => {
    await scenario(request, { body: [published, { ...published, id: 42, name: "Private draft", publicationStatus: "DRAFT" }] });
    await page.goto("/");
    const catalog = page.locator("#games");
    await expect(catalog.getByRole("heading", { name: published.name })).toBeVisible();
    await expect(catalog.getByText(published.description)).toBeVisible();
    await expect(catalog.locator(".catalog-grid")).toHaveCSS("display", "grid");
    await expect(catalog.locator(".catalog-details")).toHaveCSS("padding", "24px");
    await expect(catalog.getByText("2 DEVELOPERS")).toBeVisible();
    await expect(catalog.getByText("GAME JAM", { exact: true })).toBeVisible();
    await expect(catalog.getByText("Private draft")).toHaveCount(0);
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
    await scenario(request, { body: [{ ...published, name: "<script>bad()</script>" }] });
    await catalog.getByRole("button", { name: "REFRESH CATALOG" }).click();
    await expect(catalog.getByRole("heading", { name: "<script>bad()</script>" })).toBeVisible();
    await expect(catalog.locator("script")).toHaveCount(0);
    await scenario(request, { body: [] });
    await page.reload();
    await expect(catalog.getByRole("heading", { name: "COMING SOON" })).toBeVisible();
    await expect(catalog.getByRole("article")).toHaveCount(0);
  });

  for (const [name, data] of Object.entries({
    "HTTP 503": { status: 503, body: { message: "private upstream detail" } },
    "HTTP 401": { status: 401, body: {} },
    "redirect": { status: 302, body: {} },
    "network failure": { disconnect: true },
    "timeout": { delay: 6000, body: [] },
  })) {
    test(`${name} is unavailable, never an empty or fabricated catalog`, async ({ page, request }) => {
      await scenario(request, data);
      await page.goto("/");
      await expect(page.locator("#games").getByRole("heading", { name: "CATALOG UNAVAILABLE" })).toBeVisible({ timeout: 10000 });
      await expect(page.locator("#games").getByText("COMING SOON")).toHaveCount(0);
      await expect(page.getByText("private upstream detail")).toHaveCount(0);
    });
  }

  for (const [name, data] of Object.entries({
    "wrong envelope": { body: { content: [published] } },
    "invalid fields": { body: [{ ...published, developerCount: "2" }] },
    "unsafe identifier": { body: [{ ...published, id: Number.MAX_SAFE_INTEGER + 1 }] },
    "unknown status": { body: [{ ...published, publicationStatus: "UNKNOWN" }] },
    "duplicate identifiers": { body: [published, published] },
    "malformed JSON": { raw: "{" },
    "HTML response": { raw: "<html>error</html>", contentType: "text/html" },
  })) {
    test(`${name} rejects the response`, async ({ page, request }) => {
      await scenario(request, data);
      await page.goto("/");
      await expect(page.locator("#games").getByText("The catalog response could not be read. Please try again later.")).toBeVisible();
      await expect(page.locator("#games").getByRole("article")).toHaveCount(0);
    });
  }

  test("slow catalog streams separately from the hero and animation", async ({ page, request }) => {
    await scenario(request, { delay: 3000, body: [published] });
    await page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { name: "PLAY BEYOND THE FAMILIAR." })).toBeVisible();
    await expect(page.getByText("LOADING CARTRIDGES…")).toBeVisible();
    await expect(page.locator("canvas")).toHaveAttribute("data-playback", "running");
    const canvas = await page.locator("canvas").elementHandle();
    await expect(page.locator("#games").getByRole("heading", { name: published.name })).toBeVisible();
    expect(await canvas?.evaluate(element => element === document.querySelector("canvas"))).toBe(true);
  });
});
