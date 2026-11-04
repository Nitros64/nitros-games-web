import { test, expect, type Page } from "@playwright/test";
import { safeDownloadUrl, decodeVersion, decodeVersions, decodeDownloads } from "../src/features/game-releases/contracts";
import { mediaTests } from "./media-cases";

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
  mediaTests(login);

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

  const releaseGame = { id: 9100, name: "Release Test", description: "Fixture game only", jam: false, developerCount: 1, genreIds: [3], publicationStatus: "DRAFT" };
  const releaseVersion = { id: 50, gameId: 9100, name: "Version One", programmingLanguageId: 1, programmingToolId: 1, platformId: 1, processorId: 1 };

  test("draft versions and downloads CRUD, compatibility, CSRF and public publication", async ({ page, request }) => {
    await request.post("http://127.0.0.1:3181/admin-scenario", { data: { games: [releaseGame] } });
    await login(page);
    await page.goto("/admin/9100/versions");
    await expect(page.getByText("No versions yet.")).toBeVisible();
    const form = page.getByRole("form", { name: "Create version", exact: true });
    await form.getByLabel("Version name (4–30 characters)").fill("Version One");
    await form.getByLabel("Language", { exact: true }).selectOption("1");
    await expect(form.getByLabel("Tool", { exact: true }).locator("option")).toHaveText(["Select…", "LibGDX"]);
    await form.getByLabel("Tool", { exact: true }).selectOption("1");
    await form.getByLabel("Platform", { exact: true }).selectOption("1");
    await form.getByLabel("Processor", { exact: true }).selectOption("1");
    // Tamper with a permitted option to prove validation also occurs on the server.
    await form.getByLabel("Tool", { exact: true }).evaluate((select: HTMLSelectElement) => { select.options[1].value = "2"; });
    await form.getByRole("button", { name: "CREATE VERSION", exact: true }).click();
    await expect(form.getByRole("alert")).toContainText("incompatible");
    await expect(form.getByLabel("Version name (4–30 characters)")).toHaveValue("Version One");
    await form.getByLabel("Language", { exact: true }).selectOption("2");
    await expect(form.getByLabel("Tool", { exact: true })).toHaveValue("");
    await form.getByLabel("Language", { exact: true }).selectOption("1");
    await form.getByLabel("Tool", { exact: true }).selectOption("1");
    await form.locator('input[name="csrf"]').evaluate((input: HTMLInputElement) => { input.value = "wrong"; });
    await form.getByRole("button", { name: "CREATE VERSION", exact: true }).click();
    await expect(form.getByRole("alert")).toContainText("invalid request");
    await page.reload();
    await form.getByLabel("Version name (4–30 characters)").fill("Version One");
    for (const label of ["Language", "Tool", "Platform", "Processor"]) await form.getByLabel(label, { exact: true }).selectOption("1");
    await form.getByRole("button", { name: "CREATE VERSION", exact: true }).click();
    await expect(page.getByRole("heading", { name: "VERSION / Version One", exact: true })).toBeVisible();
    const versionURL = page.url();
    await page.getByRole("form", { name: "Edit version", exact: true }).getByLabel("Version name (4–30 characters)").fill("Version Edited");
    await page.getByRole("button", { name: "SAVE VERSION", exact: true }).click();
    await expect(page.getByRole("heading", { name: "VERSION / Version Edited", exact: true })).toBeVisible();
    const create = page.getByRole("form", { name: "Create download", exact: true });
    await create.getByLabel("Download URL").fill("javascript:alert(1)");
    await create.getByLabel("Download server").selectOption("1");
    await create.getByRole("button", { name: "CREATE DOWNLOAD", exact: true }).click();
    await expect(create.getByRole("alert")).toContainText("HTTP/HTTPS");
    await create.getByLabel("Download URL").fill("https://files.example/one.zip");
    await create.getByRole("button", { name: "CREATE DOWNLOAD", exact: true }).click();
    const edit = page.getByRole("form", { name: /Edit download/ });
    await expect(edit).toBeVisible();
    await edit.getByLabel("Download URL").fill("https://files.example/two.zip");
    await edit.getByRole("button", { name: "SAVE DOWNLOAD", exact: true }).click();
    await expect(page.getByLabel("Type https://files.example/two.zip to confirm deletion")).toHaveCount(1);
    await page.goto("/games/9100");
    await expect(page.getByText("This page could not be found.")).toBeVisible();
    await expect(page.getByRole("link", { name: /DOWNLOAD —/ })).toHaveCount(0);
    await page.goto("/admin/9100");
    await page.getByRole("button", { name: "PUBLISH GAME", exact: true }).click();
    await expect(page.getByText("STATUS / PUBLISHED", { exact: true })).toBeVisible();
    await page.goto("/games/9100");
    await expect(page.getByRole("heading", { name: "Version Edited", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "DOWNLOAD — Test Downloads", exact: true })).toHaveAttribute("href", "https://files.example/two.zip");
    await page.goto("/admin/9100");
    await page.getByRole("button", { name: "UNPUBLISH GAME", exact: true }).click();
    await expect(page.getByText("STATUS / DRAFT", { exact: true })).toBeVisible();
    await page.goto("/games/9100");
    await expect(page.getByText("This page could not be found.")).toBeVisible();
    await expect(page.getByRole("link", { name: /DOWNLOAD —/ })).toHaveCount(0);
    await page.goto(versionURL);
    await page.getByText("Delete download…", { exact: true }).click();
    const linkDeletion = page.locator("details").filter({ hasText: "Delete download…" });
    await linkDeletion.getByRole("textbox").fill("wrong");
    await linkDeletion.getByRole("button", { name: "DELETE PERMANENTLY", exact: true }).click();
    await expect(linkDeletion.getByRole("alert")).toContainText("exact value");
    await linkDeletion.getByRole("textbox").fill("https://files.example/two.zip");
    await linkDeletion.getByRole("button", { name: "DELETE PERMANENTLY", exact: true }).click();
    await expect(page.getByText("No download links yet.")).toBeVisible();
    await page.getByText("Delete version…", { exact: true }).click();
    await page.getByLabel("Type Version Edited to confirm deletion").fill("Version Edited");
    await page.getByRole("button", { name: "DELETE PERMANENTLY", exact: true }).click();
    await expect(page.getByText("No versions yet.")).toBeVisible();
  });

  test("release pages reject readers, unknown hierarchy and upstream failures", async ({ page, request }) => {
    await request.post("http://127.0.0.1:3181/admin-scenario", { data: { games: [releaseGame], versions: [releaseVersion] } });
    await login(page, "reader");
    for (const path of ["/admin/9100/versions", "/admin/9100/versions/50"]) {
      await page.goto(path);
      await expect(page.locator("main").getByRole("alert")).toContainText("requires ADMIN");
      await expect(page.getByRole("form", { name: /Create version|Create download/ })).toHaveCount(0);
    }
    await page.getByRole("button", { name: "SIGN OUT", exact: true }).click();
    await login(page);
    await page.goto("/admin/9100/versions/999");
    await expect(page.locator("main").getByRole("alert")).toContainText("not found");
    await request.post("http://127.0.0.1:3181/admin-scenario", { data: { games: [releaseGame], releasesUnavailable: true } });
    await page.goto("/admin/9100/versions");
    await expect(page.locator("main").getByRole("alert")).toContainText("unavailable");
  });

  test("public releases fail closed for unsafe links, invalid versions and upstream errors", async ({ page, request }) => {
    for (const change of [
      { links: [{ id: 60, gameVersionId: 50, serverHostImageId: 1, link: "javascript:alert(1)" }] },
      { versions: [{ ...releaseVersion, name: "x" }] },
      { releasesUnavailable: true },
      { wrongParent: true },
    ]) {
      await request.post("http://127.0.0.1:3181/admin-scenario", { data: { games: [{ ...releaseGame, publicationStatus: "PUBLISHED" }], versions: [releaseVersion], ...change } });
      await page.goto("/games/9100");
      await expect(page.getByRole("heading", { name: "DOWNLOADS UNAVAILABLE" })).toBeVisible();
      await expect(page.getByRole("link", { name: /DOWNLOAD —/ })).toHaveCount(0);
    }
  });

  test("release boundaries reject unsafe URLs, malformed IDs and duplicate resources", () => {
    for (const link of ["javascript:alert(1)", "data:text/html,test", "https://user:pass@example.com/file", "//files.example/file", "https://files.example/a b", "https://files.example/" + "a".repeat(100)]) expect(safeDownloadUrl(link)).toBe(false);
    expect(safeDownloadUrl("https://files.example/download.zip?version=1")).toBe(true);
    expect(decodeVersion({ ...releaseVersion, id: Number.MAX_SAFE_INTEGER + 1 })).toBeNull();
    expect(decodeVersion({ ...releaseVersion, programmingToolId: -1 })).toBeNull();
    expect(decodeVersions([releaseVersion, releaseVersion])).toBeNull();
    expect(decodeDownloads([{ id: 1, gameVersionId: 50, link: "https://files.example/ok", serverHostImageId: "1" }])).toBeNull();
  });
});
