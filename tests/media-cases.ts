import { test, expect, type Page } from "@playwright/test";
import { decodeMediaList, MAX_FILE_BYTES } from "../src/features/game-media/contracts";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
const game = { id: 9200, name: "Media Test", description: "Fixture media only", jam: false, developerCount: 1, genreIds: [3], publicationStatus: "DRAFT" };
const image = { id: 300, gameId: 9200, type: "COVER", position: 0, altText: "Cover alt", caption: "Cover caption", contentType: "image/png", byteSize: png.length, width: 1, height: 1 };
const endpoint = "/api/admin/games/9200/media";
const content = (admin = true, id = 300) => `/api/${admin ? "admin/" : ""}games/9200/media/${id}/content`;
const fixture = "http://127.0.0.1:3181/admin-scenario";
async function csrf(page: Page) { return page.locator('form[action="/auth/logout"] input[name="csrf"]').inputValue(); }
const headers = (token: string) => ({ Origin: "http://127.0.0.1:3100", "X-CSRF-Token": token });

// Registered within the existing serial administration describe: shares one isolated fixture without cross-file races.
export function mediaTests(login: (page: Page, role?: string) => Promise<void>) {
  test("media cover CRUD, multiple screenshots, metadata, order and publication", async ({ page, request }) => {
    await request.post(fixture, { data: { games: [game] } }); await login(page);
    await page.goto("/admin/9200"); await page.getByRole("link", { name: "MANAGE COVER & SCREENSHOTS" }).click();
    await expect(page.getByText("No cover yet.")).toBeVisible();
    const upload = page.getByRole("form", { name: "Upload images" });
    await upload.getByLabel("Image type", { exact: true }).selectOption("cover");
    await upload.getByLabel("Cover file").setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: png });
    await upload.getByLabel("Alt text", { exact: false }).fill("Test cover");
    await upload.getByRole("button", { name: "UPLOAD IMAGES" }).click();
    const cover = page.getByRole("region", { name: "Cover", exact: true });
    await expect(cover.getByRole("img", { name: "Test cover" })).toBeVisible();
    const oldSrc = await cover.getByRole("img").getAttribute("src");
    await upload.getByLabel("Cover file").setInputFiles({ name: "replacement.png", mimeType: "image/png", buffer: png });
    await upload.getByLabel("Alt text", { exact: false }).fill("Replacement cover");
    await upload.getByRole("button", { name: "UPLOAD IMAGES" }).click();
    await expect(cover.getByRole("img", { name: "Replacement cover" })).toBeVisible();
    await expect(cover.getByRole("img")).not.toHaveAttribute("src", oldSrc!);
    await upload.getByLabel("Image type", { exact: true }).selectOption("screenshot");
    await upload.getByLabel("Screenshot files").setInputFiles(["one", "two"].map(name => ({ name: `${name}.png`, mimeType: "image/png", buffer: png })));
    await upload.getByRole("button", { name: "UPLOAD IMAGES" }).click();
    await expect(page.getByRole("region", { name: "Screenshot 2", exact: true })).toBeVisible();
    const second = page.getByRole("region", { name: "Screenshot 2", exact: true });
    await second.getByLabel("Alt text", { exact: false }).fill("Second capture");
    await second.getByLabel("Caption", { exact: false }).fill("Second caption");
    await second.getByRole("button", { name: "SAVE METADATA" }).click();
    await expect(second.getByRole("img", { name: "Second capture" })).toBeVisible();
    await second.getByRole("button", { name: "MOVE UP" }).click();
    await expect(page.getByRole("region", { name: "Screenshot 1", exact: true }).getByRole("img", { name: "Second capture" })).toBeVisible();
    const privateResponse = await page.request.get(content()); expect(privateResponse.status()).toBe(200);
    expect(privateResponse.headers()["cache-control"]).toContain("no-store");
    expect((await page.request.get(content(false))).status()).toBe(404);
    await page.goto("/admin/9200"); await page.getByRole("button", { name: "PUBLISH GAME", exact: true }).click();
    await expect(page.getByText("STATUS / PUBLISHED", { exact: true })).toBeVisible();
    await page.goto("/games/9200");
    await expect(page.getByRole("img", { name: "Replacement cover" })).toBeVisible();
    await expect(page.getByText("Second caption")).toBeVisible();
    await expect(page.getByRole("link", { name: "View screenshot 1 in a new tab" })).toHaveAttribute("href", content(false, 302));
    const publicResponse = await request.get(content(false)); expect(publicResponse.status()).toBe(200);
    expect(publicResponse.headers()["cache-control"]).toBe("no-store, private");
    expect(publicResponse.headers()["x-content-type-options"]).toBe("nosniff");
    expect((await request.get(`/_next/image?url=${encodeURIComponent(content(false))}&w=640&q=75`)).status()).toBe(400);
    await page.goto("/admin/9200"); await page.getByRole("button", { name: "UNPUBLISH GAME", exact: true }).click();
    await expect(page.getByText("STATUS / DRAFT", { exact: true })).toBeVisible();
    expect((await request.get(content(false))).status()).toBe(404);
    await page.goto("/games/9200"); await expect(page.getByText("This page could not be found.")).toBeVisible();
    await page.goto("/admin/9200/media");
    await cover.getByText("Delete cover…", { exact: true }).click();
    await cover.getByLabel("Type DELETE 300 to confirm").fill("wrong");
    await cover.getByRole("button", { name: "DELETE IMAGE" }).click();
    await expect(cover.getByRole("alert")).toContainText("exact confirmation");
    await cover.getByLabel("Type DELETE 300 to confirm").fill("DELETE 300");
    await cover.getByRole("button", { name: "DELETE IMAGE" }).click(); await expect(page.getByText("No cover yet.")).toBeVisible();
    const first = page.getByRole("region", { name: "Screenshot 1", exact: true });
    await first.getByText("Delete screenshot…", { exact: true }).click();
    await first.getByLabel("Type DELETE 302 to confirm").fill("DELETE 302"); await first.getByRole("button", { name: "DELETE IMAGE" }).click();
    await expect(page.getByRole("region", { name: "Screenshot 2", exact: true })).toHaveCount(0);
    expect((await page.request.get(content(true, 302))).status()).toBe(404);
  });

  test("media multipart bypasses the 1 MB action limit and enforces 10 MiB, formats and pixels", async ({ page, request }) => {
    await request.post(fixture, { data: { games: [game] } }); await login(page); await page.goto("/admin/9200/media");
    const token = await csrf(page);
    const send = (buffer: Buffer, name = "test.png", mimeType = "image/png") => page.request.post(endpoint, { headers: headers(token), multipart: {
      operation: "screenshot", altText: "", caption: "", file: { name, mimeType, buffer },
    } });
    // Exact maximum file size, with multipart overhead: must reach the backend, not the Server Action parser.
    expect((await send(Buffer.concat([png, Buffer.alloc(MAX_FILE_BYTES - png.length)]))).status()).toBe(200);
    expect((await send(Buffer.alloc(MAX_FILE_BYTES + 1))).status()).toBe(413);
    expect((await send(Buffer.alloc(MAX_FILE_BYTES + 128 * 1024))).status()).toBe(413);
    expect((await send(png, "image.svg", "image/svg+xml")).status()).toBe(415);
    expect((await send(Buffer.from("not an image"))).status()).toBe(415);
    const huge = Buffer.from(png); huge.writeUInt32BE(5000, 16); huge.writeUInt32BE(5000, 20);
    const pixels = await send(huge); expect(pixels.status()).toBe(413); expect(await pixels.text()).toContain("20 megapixels");
    const form = page.getByRole("form", { name: "Upload images" });
    await form.getByLabel("Screenshot files").setInputFiles({ name: "invalid.svg", mimeType: "image/svg+xml", buffer: png });
    await form.getByRole("button", { name: "UPLOAD IMAGES" }).click();
    await expect(form.getByRole("alert")).toContainText("PNG or JPEG");
    await form.getByLabel("Screenshot files").setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(MAX_FILE_BYTES + 1) });
    await form.getByRole("button", { name: "UPLOAD IMAGES" }).click(); await expect(form.getByRole("alert")).toContainText("10 MiB");
  });

  test("media rejects anonymous, non-ADMIN, CSRF, invalid metadata and incomplete order", async ({ page, request }) => {
    await request.post(fixture, { data: { games: [game], media: [image] } });
    expect((await request.get(content())).status()).toBe(401);
    expect((await request.post(endpoint, { headers: headers("invalid"), data: {} })).status()).toBe(401);
    await login(page, "reader"); await page.goto("/admin/9200/media");
    await expect(page.locator("main").getByRole("alert")).toContainText("requires ADMIN");
    expect((await page.request.get(content())).status()).toBe(403);
    expect((await page.request.post(endpoint, { headers: headers(await csrf(page)), data: {} })).status()).toBe(403);
    await page.getByRole("button", { name: "SIGN OUT", exact: true }).click(); await login(page);
    await page.goto("/admin/9200/media"); const token = await csrf(page);
    expect((await page.request.delete(endpoint, { headers: headers("wrong"), data: { mediaId: 300, confirmation: "DELETE 300" } })).status()).toBe(403);
    expect((await page.request.delete(endpoint, { headers: { ...headers(token), Origin: "https://evil.example" }, data: {} })).status()).toBe(403);
    expect((await page.request.put(endpoint, { headers: headers(token), data: { operation: "metadata", mediaId: 300, altText: "a".repeat(201), caption: "" } })).status()).toBe(400);
    expect((await page.request.put(endpoint, { headers: headers(token), data: { operation: "order", screenshotIds: [300, 300] } })).status()).toBe(400);
    expect((await page.request.put(endpoint, { headers: headers(token), data: { operation: "metadata", mediaId: 999, altText: "", caption: "" } })).status()).toBe(404);
    expect((await page.request.get("/api/admin/games/999/media/300/content")).status()).toBe(404);
    await page.getByRole("button", { name: "SIGN OUT", exact: true }).click(); expect((await page.request.get(content())).status()).toBe(401);
  });

  test("media public fallbacks, errors and responsive layout preserve downloads", async ({ page, request }) => {
    await request.post(fixture, { data: { games: [{ ...game, publicationStatus: "PUBLISHED" }] } });
    await page.goto("/games/9200"); await expect(page.getByText("No cover available yet.")).toBeVisible();
    await expect(page.getByText("No screenshots available yet.")).toBeVisible(); await expect(page.getByText("No versions available yet.")).toBeVisible();
    await request.post(fixture, { data: { games: [{ ...game, publicationStatus: "PUBLISHED" }], mediaStatus: 503 } });
    await page.reload(); await expect(page.getByText("Images are unavailable right now.")).toBeVisible();
    await login(page); await page.goto("/admin/9200/media"); await expect(page.locator("main").getByRole("alert")).toContainText("unavailable");
    await request.post(fixture, { data: { games: [game], media: [image] } }); await page.reload();
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  });

  test("media decoder rejects cross-game, arbitrary URLs, duplicate IDs and invalid image contracts", () => {
    const valid = { ...image, contentUrl: "/api/v1/admin/games/9200/media/300/content" };
    expect(decodeMediaList([valid], 9200)).not.toBeNull();
    for (const change of [{ gameId: 1 }, { contentUrl: "https://evil.example/image" }, { contentType: "image/svg+xml" }, { width: 50000, height: 50000 }, { altText: "x".repeat(201) }, { position: 1 }, { id: -1 }])
      expect(decodeMediaList([{ ...valid, ...change }], 9200)).toBeNull();
    expect(decodeMediaList([valid, valid], 9200)).toBeNull();
    expect(decodeMediaList([{ ...valid, type: "SCREENSHOT", position: 2 }], 9200)).toBeNull();
    expect(decodeMediaList([valid], 9200, false)).toBeNull();
  });
}
