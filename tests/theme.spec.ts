import { test, expect } from "@playwright/test";
const labels: Record<string, string> = { "retro-mix": "RETRO MIX", nes: "8-BIT", snes: "16-BIT", n64: "64-BIT" };

for (const theme of ["retro-mix", "nes", "snes", "n64"]) {
  for (const mode of ["light", "dark"]) {
    test(`${theme} / ${mode} persists across navigation and refresh`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto("/");
      await expect(page.getByRole("button", { name: "RETRO MIX", exact: true })).toBeEnabled();
      await page.getByRole("button", { name: labels[theme], exact: true }).click();
      if (mode === "dark") await page.getByRole("button", { name: "Dark mode", exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator("html")).toHaveAttribute("data-mode", mode);
      const background = await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(background).not.toBe("rgba(0, 0, 0, 0)");
      await page.getByRole("link", { name: "STUDIO", exact: true }).click();
      await expect(page).toHaveURL(/\/studio$/);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.reload();
      await expect(page.getByRole("button", { name: labels[theme], exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("html")).toHaveAttribute("data-mode", mode);
      await expect(page.locator("body")).toHaveCSS("background-color", background);
      expect(errors).toEqual([]);
    });
  }
}

test("defaults to system, follows changes and can return to automatic mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "retro-mix");
  await expect(page.getByRole("button", { name: "Dark mode", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
  await page.getByRole("button", { name: "Dark mode", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
  await page.getByRole("button", { name: "Use system color preference" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
});

test("saved appearance applies before React JavaScript loads", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("nitros-appearance", JSON.stringify({ theme: "snes", mode: "dark" })));
  await page.route(/\/_next\/.*\.js(?:\?|$)/, (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "snes");
  await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

for (const value of ["{broken", '{"theme":"bad","mode":"bad"}', "null"]) {
  test(`invalid stored preference recovers: ${value}`, async ({ page }) => {
    await page.addInitScript((stored) => localStorage.setItem("nitros-appearance", stored), value);
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "retro-mix");
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
  });
}

test("controls work when localStorage is unavailable", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage blocked"); } }));
  await page.goto("/");
  await page.getByRole("button", { name: "64-BIT", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "n64");
});

test("preferences synchronize across tabs", async ({ page, context }) => {
  await page.goto("/");
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.getByRole("button", { name: "RETRO MIX", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "8-BIT", exact: true }).click();
  await expect(other.getByRole("button", { name: "8-BIT", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("keyboard controls and mobile layouts remain usable for all combinations", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.getByRole("button", { name: "8-BIT", exact: true }).focus();

  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "nes");
  for (const theme of ["retro-mix", "nes", "snes", "n64"]) {
    await page.getByRole("button", { name: labels[theme], exact: true }).click();
    for (let i = 0; i < 2; i++) {
      await page.getByRole("button", { name: "Dark mode", exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole("heading", { name: "OUR GAMES", exact: true })).toBeVisible();
    }
  }
});

