import { test, expect } from "@playwright/test";

test("production hides experiments and retains animation, navigation and themes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page.getByRole("group", { name: "Hero experiment" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /ARCADE BATTLEFIELD|LIVING PIXEL WORLD/ })).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveAttribute("data-playback", "running");
  await page.getByRole("button", { name: "PAUSE SCENE", exact: true }).click();
  await expect(page.locator("canvas")).toHaveAttribute("data-playback", "paused");
  await page.getByRole("button", { name: "8-BIT", exact: true }).click();
  await page.getByRole("button", { name: "Dark mode", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "nes");
  await expect(page.getByRole("button", { name: "8-BIT", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "STUDIO", exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/);
  expect(errors).toEqual([]);
});
