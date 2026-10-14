"use client";

import { useEffect, useRef, useState } from "react";
import { drawArcade } from "./scenes/arcade";
import { drawLiving } from "./scenes/living";
import type { ScenePalette, SceneVariant } from "./scenes/drawing";
import { PixelLandscape } from "./pixel-landscape";

const paletteKeys = ["sky", "haze", "far", "middle", "ground", "edge", "water", "light", "ship", "enemy", "spark"] as const;

export function LivingScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsedRef = useRef(1.4);
  const [variant, setVariant] = useState<SceneVariant>("arcade");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const compactQuery = matchMedia("(max-width: 600px)");
    let visible = false;
    let animationId = 0;
    let previous = 0;
    let time = elapsedRef.current;
    let lastPaint = 0;
    let palette: ScenePalette;
    let generation = "retro-mix";
    let sceneWidth = 560;
    let sceneHeight = 200;
    const renderScene = variant === "arcade" ? drawArcade : drawLiving;

    function readPalette() {
      const style = getComputedStyle(canvas!);
      palette = Object.fromEntries(paletteKeys.map(key => [key, style.getPropertyValue(`--scene-${key}`).trim()])) as ScenePalette;
      generation = document.documentElement.dataset.theme || "retro-mix";
    }
    function paint() {
      renderScene({ ctx: ctx!, width: sceneWidth, height: sceneHeight, time, palette, compact: compactQuery.matches, generation });
    }
    function tick(now: number) {
      // No animation state enters React. Time freezes while paused or offscreen.
      if (previous) time += Math.min((now - previous) / 1000, .1);
      elapsedRef.current = time;
      previous = now;
      if (now - lastPaint >= 1000 / (compactQuery.matches ? 12 : 24)) {
        paint();
        lastPaint = now;
      }
      animationId = requestAnimationFrame(tick);
    }
    function syncPlayback() {
      cancelAnimationFrame(animationId);
      previous = 0;
      const running = visible && !document.hidden && !reduced.matches && !paused;
      canvas!.dataset.playback = reduced.matches ? "reduced" : running ? "running" : "paused";
      paint();
      if (running) animationId = requestAnimationFrame(tick);
    }
    function resize() {
      const bounds = canvas!.getBoundingClientRect();
      // Preserve world coordinates and motion; only Arcade gets a crisp display buffer.
      sceneWidth = compactQuery.matches ? 240 : generation === "nes" ? 400 : 560;
      sceneHeight = Math.max(200, Math.round(sceneWidth * bounds.height / Math.max(1, bounds.width)));
      if (variant === "arcade") {
        const density = Math.min(window.devicePixelRatio || 1, 2);
        canvas!.width = Math.max(1, Math.round(bounds.width * density));
        canvas!.height = Math.max(1, Math.round(bounds.height * density));
        ctx!.setTransform(canvas!.width / sceneWidth, 0, 0, canvas!.height / sceneHeight, 0, 0);
        ctx!.lineWidth = 1.25 * sceneWidth / Math.max(1, bounds.width);
        ctx!.lineCap = "round";
        ctx!.lineJoin = "round";
      } else {
        canvas!.width = sceneWidth;
        canvas!.height = sceneHeight;
        ctx!.imageSmoothingEnabled = false;
      }
      paint();
    }
    readPalette();
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; syncPlayback(); }, { threshold: .05 });
    intersection.observe(canvas);
    const appearance = new MutationObserver(() => { readPalette(); resize(); });
    appearance.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mode"] });
    document.addEventListener("visibilitychange", syncPlayback);
    reduced.addEventListener("change", syncPlayback);
    compactQuery.addEventListener("change", resize);
    window.addEventListener("resize", resize);
    syncPlayback();
    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect(); intersection.disconnect(); appearance.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      reduced.removeEventListener("change", syncPlayback);
      compactQuery.removeEventListener("change", resize);
      window.removeEventListener("resize", resize);
    };
  }, [variant, paused]);

  return <div className="scene-stage" data-variant={variant}>
    <div className="scene-fallback" aria-hidden="true"><PixelLandscape /></div>
    <canvas ref={canvasRef} className="living-canvas" style={{ imageRendering: variant === "arcade" ? "auto" : "pixelated" }} aria-hidden="true" />
    <div className="scene-controls">
      {process.env.NODE_ENV === "development" && <div className="experiment-switch" role="group" aria-label="Hero experiment">
        <span>DEV / SCENE</span>
        <button type="button" aria-pressed={variant === "arcade"} onClick={() => setVariant("arcade")}>A · ARCADE BATTLEFIELD</button>
        <button type="button" aria-pressed={variant === "living"} onClick={() => setVariant("living")}>B · LIVING PIXEL WORLD</button>
      </div>}
      <button className="motion-toggle" type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "RESUME SCENE" : "PAUSE SCENE"}</button>
      <span className="reduced-motion-note">STILL SCENE / REDUCED MOTION</span>
    </div>
  </div>;
}

