import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, role = "admin") {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByRole("button", { name: "SIGN IN", exact: true }).click();
  await page.getByRole("button", { name: role === "admin" ? "Test admin" : "Test reader", exact: true }).click();
}

test.describe("OIDC and game administration", () => {
  test.describe.configure({ mode: "default" });
  test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL), "Requires the isolated OIDC provider and API.");
  test.beforeEach(async ({ request }) => { await request.post("http://127.0.0.1:3181/admin-scenario", { data: {} }); });

  test("PKCE login, draft CRUD, publication, confirmation and logout", async ({ page, context }) => {
    const apiRequests: string[] = [];
    page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/v1/")) apiRequests.push(request.url()); });
    await login(page);
    await expect(page.getByRole("heading", { name: "GAME ADMINISTRATION" })).toBeVisible();
    const cookie = (await context.cookies()).find(value => value.name === "ng-session");
    expect(cookie?.httpOnly).toBe(true); expect(cookie?.sameSite).toBe("Lax");
    expect(cookie?.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    await page.getByRole("link", { name: "CREATE GAME", exact: true }).click();
    await page.getByLabel("Name (4–30 characters)", { exact: true }).fill("Test Orbit");
    await page.getByLabel("Description (4–30 characters)").fill("Test-only adventure");
    await page.getByRole("button", { name: "CREATE DRAFT" }).click();
    await expect(page.getByText("Select at least one valid genre.")).toBeVisible();
    // Values must survive server validation failures.
    await expect(page.getByLabel("Name (4–30 characters)", { exact: true })).toHaveValue("Test Orbit");
    await page.getByLabel("Arcade", { exact: true }).check();
    await page.getByRole("button", { name: "CREATE DRAFT" }).click();
    await expect(page.getByText("STATUS / DRAFT", { exact: true })).toBeVisible();
    await page.getByLabel("Name (4–30 characters)", { exact: true }).fill("Test Orbit Edited");
    await page.getByRole("button", { name: "SAVE CHANGES" }).click();
    await expect(page.getByRole("heading", { name: "EDIT / Test Orbit Edited" })).toBeVisible();
    await page.getByRole("button", { name: "PUBLISH GAME", exact: true }).click();
    await expect(page.getByText("STATUS / PUBLISHED", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "UNPUBLISH GAME", exact: true }).click();
    await expect(page.getByText("STATUS / DRAFT", { exact: true })).toBeVisible();
    await page.getByText("Delete game…", { exact: true }).click();
    await page.getByLabel("Type Test Orbit Edited to confirm deletion").fill("wrong");
    await page.getByRole("button", { name: "DELETE PERMANENTLY" }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveText("Type the exact game name to confirm deletion.");
    await page.getByLabel("Type Test Orbit Edited to confirm deletion").fill("Test Orbit Edited");
    await page.getByRole("button", { name: "DELETE PERMANENTLY" }).click();
    await expect(page.getByText("No games yet.")).toBeVisible();
    expect(apiRequests).toEqual([]);
    expect(await page.evaluate(() => Object.keys(localStorage).some(key => /token/i.test(key)))).toBe(false);
    await page.getByRole("button", { name: "SIGN OUT", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    expect((await context.cookies()).some(value => value.name === "ng-session")).toBe(false);
    await page.goto("/admin/new");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("Spring Boot denies a reader on list, edit and creation pages", async ({ page }) => {
    await login(page, "reader");
    await expect(page.locator("main").getByRole("alert")).toHaveText("Access denied. Spring Boot requires ADMIN permission.");
    await expect(page.getByRole("link", { name: "CREATE GAME", exact: true })).toHaveCount(0);
    for (const path of ["/admin/new", "/admin/9000"]) {
      await page.goto(path);
      await expect(page.locator("main").getByRole("alert")).toHaveText("Access denied. Spring Boot requires ADMIN permission.");
      await expect(page.getByRole("button", { name: /CREATE DRAFT|SAVE CHANGES/ })).toHaveCount(0);
    }
  });

  test("rejects cross-origin login/logout and invalid mutation CSRF tokens", async ({ page, request }) => {
    expect((await request.post("/auth/login", { headers: { Origin: "https://evil.example" } })).status()).toBe(403);
    await login(page);
    expect((await page.request.post("/auth/logout", { headers: { Origin: "https://evil.example" }, form: { csrf: "wrong" } })).status()).toBe(403);
    expect((await page.request.post("/auth/logout", { headers: { Origin: "http://127.0.0.1:3100" }, form: { csrf: "wrong" } })).status()).toBe(403);
    await page.getByRole("link", { name: "CREATE GAME", exact: true }).click();
    await page.getByLabel("Name (4–30 characters)", { exact: true }).fill("CSRF Test Game");
    await page.getByLabel("Description (4–30 characters)").fill("Test-only description");
    await page.getByLabel("Arcade", { exact: true }).check();
    await page.locator('.admin-form input[name="csrf"]').evaluate((input: HTMLInputElement) => { input.value = "invalid"; });
    await page.getByRole("button", { name: "CREATE DRAFT" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("invalid request");
    await page.goto("/admin");
    await expect(page.getByText("No games yet.")).toBeVisible();
  });

  test("callback rejects missing transaction, incorrect state and incorrect nonce", async ({ page, request }) => {
    await page.goto("/auth/callback?code=forged&state=forged");
    await expect(page).toHaveURL(/error=callback/);
    await page.getByRole("button", { name: "SIGN IN", exact: true }).click();
    await expect(page.getByRole("button", { name: "Test admin", exact: true })).toBeVisible();
    await page.goto("/auth/callback?code=forged&state=wrong");
    await expect(page).toHaveURL(/error=callback/);
    await request.post("http://127.0.0.1:3181/admin-scenario", { data: { invalidNonce: true } });
    await login(page);
    await expect(page).toHaveURL(/error=callback/);
    await expect(page.locator("main").getByRole("alert")).toContainText("Sign-in could not be completed");
  });

  test("expired sessions require login again", async ({ page, request }) => {
    await request.post("http://127.0.0.1:3181/admin-scenario", { data: { lifetime: 8 } });
    await login(page);
    await expect(page.getByRole("heading", { name: "GAME ADMINISTRATION" })).toBeVisible();
    const cookie = (await page.context().cookies()).find(value => value.name === "ng-session");
    expect(cookie).toBeDefined();
    // Keep the browser cookie alive to prove the server record enforces expiry.
    await page.context().addCookies([{ ...cookie!, expires: Math.floor(Date.now() / 1000) + 600 }]);
    await expect.poll(async () => (await page.request.get("/admin")).text(), { timeout: 10000 }).toContain("/admin/login?error=session");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("upstream errors are safe and the editor is responsive", async ({ page, request }) => {
    await login(page);
    await page.getByRole("link", { name: "CREATE GAME", exact: true }).click();
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
    await request.post("http://127.0.0.1:3181/admin-scenario", { data: { status: 503 } });
    await page.goto("/admin");
    await expect(page.locator("main").getByRole("alert")).toContainText("service is unavailable");
    await expect(page.getByText("upstream detail")).toHaveCount(0);
  });
});
