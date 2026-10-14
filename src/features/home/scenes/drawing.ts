export type SceneVariant = "arcade" | "living";
export type ScenePalette = Record<"sky" | "haze" | "far" | "middle" | "ground" | "edge" | "water" | "light" | "ship" | "enemy" | "spark", string>;
export type SceneFrame = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  time: number;
  palette: ScenePalette;
  compact: boolean;
  generation: string;
};
export type SceneRenderer = (frame: SceneFrame) => void;

export function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, width: number, height: number) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

/** All sprite maps are original. Digits index a small palette; dots are transparent. */
export function sprite(ctx: CanvasRenderingContext2D, rows: readonly string[], colors: readonly string[], x: number, y: number, scale = 1, flip = false) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) { ctx.translate(rows[0].length * scale, 0); ctx.scale(-1, 1); }
  rows.forEach((row, yy) => [...row].forEach((pixel, xx) => {
    if (pixel !== ".") rect(ctx, colors[Number(pixel)], xx * scale, yy * scale, scale, scale);
  }));
  ctx.restore();
}

export const scout = [
  "....00..............", ".....010............", "..000011000.........", "00011111222000......", "33111111222211000...", "..00111111111111100.", "00011111222211000...", "..000011000.........", ".....010............", "....00..............",
];
export const drone = [
  "..0.......0..", ".010.....010.", "0111000001110", "0111122211110", "..011222110..", "...0011100...", "..00.000.00..", ".00.......00.",
];
export const walker = [
  "..00....00...", "..01000010...", ".0111111110..", "011221122110.", "011221122110.", ".0111111110..", "..00000000...", "..01....10...", ".00......00..",
];

export function mountains(f: SceneFrame, baseline: number, color: string, amplitude: number, speed: number) {
  const { ctx, width, time } = f;
  const step = f.generation === "n64" ? 14 : 4;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(-step, f.height);
  for (let x = -step; x <= width + step; x += step) {
    const worldX = x + time * speed;
    const y = Math.round((baseline - (Math.sin(worldX / 47) + Math.sin(worldX / 19) * .35) * amplitude) / step) * step;
    if (f.generation !== "n64") ctx.lineTo(x, y);
    ctx.lineTo(x + step, y);
  }
  ctx.lineTo(width + step, f.height); ctx.closePath(); ctx.fill();
  // Sparse, deterministic rock strata add texture without another color ramp.
  for (let i = 0; i < width / 6; i++) {
    const x = (i * 41 - time * speed + width * 100) % width;
    const worldX = x + time * speed;
    const ridge = baseline - (Math.sin(worldX / 47) + Math.sin(worldX / 19) * .35) * amplitude;
    rect(ctx, f.palette.haze, x, ridge + 5 + i % 4 * 4, i % 3 + 1, 1);
  }
}

export function atmosphere(f: SceneFrame) {
  const { ctx, width, height, palette: p, time, compact } = f;
  rect(ctx, p.sky, 0, 0, width, height);
  rect(ctx, p.haze, 0, height * .55, width, height * .45);
  // Deterministic stars travel at different speeds; no random render/hydration state.
  for (let i = 0; i < (compact ? 25 : 70); i++) {
    const x = ((i * 79.7 - time * (i % 3 + 1) * .5) % width + width) % width;
    const y = (i * 37.3) % (height * .62);
    rect(ctx, i % 4 ? p.far : p.light, x, y, i % 11 ? 1 : 2, 1);
  }
  const px = width * .56, py = height * .22;
  for (let y = -19; y <= 19; y++) {
    const span = Math.floor(Math.sqrt(19 * 19 - y * y));
    rect(ctx, y < -5 ? p.light : y < 5 ? p.edge : p.far, px - span, py + y, span * 2, 1);
  }
  rect(ctx, p.haze, px - 30, py + 7, 59, 2);
}

export function burst(f: SceneFrame, x: number, y: number, progress: number) {
  if (progress < 0 || progress > 1) return;
  const { ctx, palette: p } = f;
  // Small expanding debris, never a full-screen flash or rapid strobe.
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const distance = 3 + progress * 15;
    rect(ctx, i % 2 ? p.spark : p.light, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, progress < .5 ? 3 : 2, 2);
  }
}

