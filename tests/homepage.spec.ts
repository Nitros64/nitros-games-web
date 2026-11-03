import { test, expect } from "@playwright/test";

for (const mode of ["light", "dark"] as const) {
  test(`living hero ${mode}: palette, font, navigation and artwork`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: mode, reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("body")).toHaveCSS("background-color", mode === "light" ? "rgb(232, 223, 198)" : "rgb(21, 32, 51)");
    await expect(page.locator("body")).toHaveCSS("color", mode === "light" ? "rgb(36, 52, 69)" : "rgb(242, 230, 199)");
    await expect(page.locator(".site-header")).toHaveCSS("background-color", mode === "light" ? "rgb(228, 181, 86)" : "rgb(35, 48, 70)");
    await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
    await expect(page.locator(".info-panel").first()).toHaveCSS("background-image", "none");
    expect(await page.locator("h1").evaluate(el => { const family = getComputedStyle(el).fontFamily.split(",")[0]; return Array.from(document.fonts).some(font => font.status === "loaded" && family.includes(font.family.replaceAll('"', ""))); })).toBe(true);
    const artwork = await page.locator(".living-canvas").boundingBox();
    expect(artwork?.width).toBe(1440);
    expect(artwork!.height).toBeGreaterThan(500);
    for (const name of ["HOME", "GAMES", "STUDIO", "CONTACT"]) await expect(page.getByRole("navigation").getByRole("link", { name, exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`desktop-${mode}.png`), fullPage: true, style: "nextjs-portal { display: none; }" });
    await page.getByRole("link", { name: "EXPLORE GAMES", exact: true }).click();
    await expect(page).toHaveURL(/#games$/);
    await expect(page.locator("#games").getByRole("heading", { name: "OUR GAMES", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "CONTACT", exact: true }).click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.getByRole("heading", { name: "KEEP IN TOUCH" })).toBeVisible();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
    await page.screenshot({ path: testInfo.outputPath(`mobile-${mode}.png`), fullPage: true, style: "nextjs-portal { display: none; }" });
  });
}
