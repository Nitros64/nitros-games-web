import { atmosphere, mountains, rect, scout, sprite, walker, type SceneFrame, type SceneRenderer } from "./drawing";

function tree(f: SceneFrame, x: number, y: number, size = 1) {
  const { ctx, palette: p } = f;
  sprite(ctx, [
    "........0........", ".......010.......", "......01110......", ".....0112110.....", "....011111110....", "......01110......", ".....0112110.....", "....011111110....", "...01121111110...", "..0111111211110..", "....011111110....", "...01121111110...", "..0111111211110..", ".011211111111110.", "01111111211111110", ".....0000000.....", ".......00........", ".......00........", ".......00........",
  ], [p.ground, p.edge, p.light], x - 8 * size, y - 11 * size, size);
}

export const drawLiving: SceneRenderer = (f) => {
  const { ctx, width: w, height: h, time: t, palette: p, compact } = f;
  atmosphere(f);
  // Long cloud bands drift independently of the mountain ridges.
  for (let i = 0; i < 5; i++) {
    const x = (i * 113 + t * 1.2) % (w + 60) - 40;
    rect(ctx, p.light, x, h * .36 + i % 2 * 12, 22, 2);
    rect(ctx, p.light, x + 5, h * .36 - 3 + i % 2 * 12, 11, 3);
  }
  mountains(f, h * .62, p.far, 23, .7);
  mountains(f, h * .73, p.middle, 15, 1.6);
  const ruinX = w * .59, ruinY = h * .68;
  rect(ctx, p.far, ruinX, ruinY - 46, 23, 55);
  for (let i = 0; i < 3; i++) rect(ctx, p.edge, ruinX + i * 9, ruinY - 51, 5, 7);
  rect(ctx, p.sky, ruinX + 8, ruinY - 32, 7, 12);
  rect(ctx, p.light, ruinX + 7, ruinY - 14, 8, 2);
  rect(ctx, p.ground, ruinX + 27, ruinY - 19, 2, 19);
  rect(ctx, p.enemy, ruinX + 29, ruinY - 19, 10, 6 + Math.floor(Math.sin(t * 3) * 2));
  const ground = h * .84;
  rect(ctx, p.water, 0, ground, w, h - ground);
  for (let i = 0; i < (compact ? 14 : 30); i++) rect(ctx, i % 3 ? p.edge : p.light, (i * 47 + t * (i % 2 ? 4 : -3) + w * 50) % w, ground + 5 + i * 11 % (h - ground), 4 + i % 5, 1);
  // Two grassy ledges, an ancient bridge and a stepped waterfall.
  rect(ctx, p.ground, 0, ground - 6, w * .32, h * .16);
  rect(ctx, p.edge, 0, ground - 7, w * .32, 3);
  rect(ctx, p.ground, w * .62, ground - 6, w * .38, h * .16);
  rect(ctx, p.edge, w * .62, ground - 7, w * .38, 3);
  rect(ctx, p.ground, w * .29, ground - 5, w * .36, 4);
  for (let i = 0; i < 10; i++) rect(ctx, p.light, w * .29 + i * w * .036, ground - 5, 2, 2);
  for (let i = 0; i < 8; i++) rect(ctx, p.middle, w * .29 + i * w * .049, ground - 15, 1, 10);
  rect(ctx, p.edge, w * .29, ground - 15, w * .36, 1);
  rect(ctx, p.water, w * .16, ground - 4, 10, h * .18);
  for (let i = 0; i < 7; i++) rect(ctx, p.light, w * .16 + i % 3 * 3, ground + (i * 7 + t * 15) % (h * .16), 1, 4);
  for (let i = 0; i < (compact ? 5 : 12); i++) {
    const x = (i * 67 - t * 1.5 + w * 50) % w;
    if (x < w * .28 || x > w * .67) tree(f, x, ground - 21, i % 3 === 0 ? 1.5 : 1);
  }
  // Patrols use a walk cycle and reverse direction at the end of the ledge.
  for (let i = 0; i < (compact ? 1 : 3); i++) {
    const phase = t * .22 + i * 2, x = w * (.18 + i * .25) + Math.sin(phase) * 22;
    const y = ground - 18 + (Math.floor(t * 5 + i) % 2);
    sprite(ctx, walker, [p.ground, i % 2 ? p.enemy : p.ship, p.light], x, y, 1.3, Math.cos(phase) < 0);
    rect(ctx, p.edge, x - 1, ground - 6, 21, 1);
  }
  const shipX = (t * 13 + w * .3) % (w + 50) - 30;
  sprite(ctx, scout, [p.ground, p.ship, p.light, p.spark], shipX, h * .51 + Math.sin(t) * 3);
  for (let i = 0; i < (compact ? 4 : 12); i++) {
    const x = (i * 63 + Math.sin(t + i) * 7 + w) % w;
    rect(ctx, i % 2 ? p.spark : p.light, x, ground - 27 + Math.sin(t * .8 + i) * 8, 1, 1);
  }
  // Foreground flora creates a final depth layer without covering the UI.
  for (let i = 0; i < w / 25; i++) {
    const x = (i * 37 - t * 3 + w * 50) % w;
    rect(ctx, p.ground, x, h - 9, 3, 9);
    rect(ctx, p.middle, x - 3, h - 12, 9, 4);
    if (i % 3 === 0) rect(ctx, p.enemy, x, h - 14, 3, 3);
  }
};

