import { test, expect, type Page } from "@playwright/test";

const imageData = (page: Page) => page.locator("canvas").evaluate((el: HTMLCanvasElement) => el.toDataURL());

type SceneObserverWindow = Window & { deliverSceneVisibility?: (states: boolean[]) => void };

test("batched visibility uses the latest state and preserves manual pause after reduced motion", async ({ page }) => {
  // Deliver real-shaped observer batches deterministically, without screenshot timing.
  await page.addInitScript(() => {
    const sceneWindow = window as SceneObserverWindow;
    const NativeObserver = window.IntersectionObserver;
    window.IntersectionObserver = class extends NativeObserver {
      private canvas?: HTMLCanvasElement;
      private readonly deliver: (states: boolean[]) => void;

      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        super(callback, options);
        this.deliver = states => {
          const target = this.canvas;
          if (!target) return;
          const bounds = target.getBoundingClientRect();
          const time = performance.now();
          callback(states.map((visible, index) => ({
            target, time: time + index, isIntersecting: visible,
            intersectionRatio: visible ? 1 : 0, boundingClientRect: bounds,
            intersectionRect: visible ? bounds : new DOMRect(), rootBounds: null,
          })), this);
        };
      }

      observe(target: Element) {
        if (target instanceof HTMLCanvasElement) {
          this.canvas = target;
          sceneWindow.deliverSceneVisibility = this.deliver;
        } else super.observe(target);
      }

      disconnect() {
        if (sceneWindow.deliverSceneVisibility === this.deliver) delete sceneWindow.deliverSceneVisibility;
        this.canvas = undefined;
        super.disconnect();
      }
    };
  });
  const deliver = (states: boolean[]) => page.evaluate(values => {
    const send = (window as SceneObserverWindow).deliverSceneVisibility;
    if (!send) throw new Error("The scene observer is not mounted");
    send(values);
  }, states);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-playback", "reduced");
  await deliver([false, true]);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(canvas).toHaveAttribute("data-playback", "running");
  const initial = await imageData(page);
  await expect.poll(() => imageData(page)).not.toBe(initial);

  await page.getByRole("button", { name: "PAUSE SCENE", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-playback", "paused");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(canvas).toHaveAttribute("data-playback", "reduced");
  await deliver([false, true]);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(canvas).toHaveAttribute("data-playback", "paused");
  await expect(page.getByRole("button", { name: "RESUME SCENE", exact: true })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "RESUME SCENE", exact: true }).click();
  await deliver([true, false]);
  await expect(canvas).toHaveAttribute("data-playback", "paused");
  await deliver([false, true]);
  await expect(canvas).toHaveAttribute("data-playback", "running");
  await page.getByRole("link", { name: "STUDIO", exact: true }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await expect.poll(() => page.evaluate(() => typeof (window as SceneObserverWindow).deliverSceneVisibility)).toBe("undefined");
});

test("Arcade stays crisp on high-density displays without changing Living's pixel grid", async ({ browser }) => {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    await page.goto("/");
    const canvas = page.locator("canvas");
    const resolution = () => canvas.evaluate((el: HTMLCanvasElement) => ({
      width: el.width, height: el.height,
      expectedWidth: Math.round(el.getBoundingClientRect().width * 2),
      expectedHeight: Math.round(el.getBoundingClientRect().height * 2),
    }));
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect.poll(async () => { const size = await resolution(); return size.width === size.expectedWidth && size.height === size.expectedHeight; }).toBe(true);
      await expect(canvas).toHaveCSS("image-rendering", "auto");
      await page.getByRole("button", { name: "B · LIVING PIXEL WORLD", exact: true }).click();
      await expect(canvas).toHaveAttribute("width", width < 600 ? "240" : "560");
      await expect(canvas).toHaveCSS("image-rendering", "pixelated");
      await page.getByRole("button", { name: "A · ARCADE BATTLEFIELD", exact: true }).click();
    }
  } finally {
    await context.close();
  }
});

for (const variant of ["A · ARCADE BATTLEFIELD", "B · LIVING PIXEL WORLD"]) {
  test(`${variant}: actual motion, manual pause and offscreen pause`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await page.getByRole("button", { name: variant, exact: true }).click();
    const canvas = page.locator("canvas");
    await expect(canvas).toHaveAttribute("data-playback", "running");
    const initial = await imageData(page);
    await expect.poll(() => imageData(page)).not.toBe(initial);
    await page.getByRole("button", { name: "PAUSE SCENE", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-playback", "paused");
    const paused = await imageData(page);
    await page.waitForTimeout(250);
    expect(await imageData(page)).toBe(paused);
    await page.getByRole("button", { name: "RESUME SCENE", exact: true }).click();
    await expect(canvas).toHaveAttribute("data-playback", "running");
    await page.locator("footer").scrollIntoViewIfNeeded();
    await expect(canvas).toHaveAttribute("data-playback", "paused");
    const offscreen = await imageData(page);
    await page.waitForTimeout(250);
    expect(await imageData(page)).toBe(offscreen);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(canvas).toHaveAttribute("data-playback", "running");
    expect(errors).toEqual([]);
  });

  test(`${variant}: reduced motion, responsive composition and both palettes`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await page.getByRole("button", { name: variant, exact: true }).click();
    await expect(page.locator("canvas")).toHaveAttribute("data-playback", "reduced");
    const still = await imageData(page);
    await page.waitForTimeout(200);
    expect(await imageData(page)).toBe(still);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: testInfo.outputPath("desktop-light.png"), fullPage: true, style: "nextjs-portal {display:none}" });
    await page.getByRole("button", { name: "Dark mode", exact: true }).click();
    if (variant.startsWith("A")) expect(await imageData(page)).toBe(still);
    else await expect.poll(() => imageData(page)).not.toBe(still);
    await page.screenshot({ path: testInfo.outputPath("desktop-dark.png"), fullPage: true, style: "nextjs-portal {display:none}" });
    for (const width of [768, 375, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      const intro = await page.locator(".hero-intro").boundingBox();
      const windows = await page.locator(".hero-windows").boundingBox();
      if (width < 600) {
        const scene = await page.locator("canvas").boundingBox();
        const controls = await page.locator(".scene-controls").boundingBox();
        expect(scene!.height).toBe(280);
        expect(scene!.y).toBeGreaterThanOrEqual(intro!.y + intro!.height);
        expect(windows!.y).toBeGreaterThanOrEqual(scene!.y + scene!.height);
        expect(controls!.y).toBeGreaterThanOrEqual(windows!.y + windows!.height);
      }
      await expect(page.getByRole("link", { name: "EXPLORE GAMES", exact: true })).toBeVisible();
    }
    await page.screenshot({ path: testInfo.outputPath("mobile-dark.png"), fullPage: true, style: "nextjs-portal {display:none}" });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.locator("canvas").scrollIntoViewIfNeeded();
    await expect(page.locator("canvas")).toHaveAttribute("data-playback", "running");
  });
}

test("hidden documents stop rendering", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveAttribute("data-playback", "running");
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(page.locator("canvas")).toHaveAttribute("data-playback", "paused");
  const hidden = await imageData(page);
  await page.waitForTimeout(250);
  expect(await imageData(page)).toBe(hidden);
});
