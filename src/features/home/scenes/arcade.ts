import { rect, type SceneRenderer } from "./drawing";

// Original vector hull outlines, not sprites from existing games.
const neon = ["#d103e9", "#ff0a1f", "#083af2", "#ffdd32", "#2dfc64", "#ff6118", "#18dbff"] as const;
type Point = readonly [number, number];
type Hull = readonly (readonly Point[])[];
const hulls: readonly Hull[] = [
  [[[-9,-6],[-4,-2],[0,-7],[4,-2],[9,-6],[7,5],[3,3],[0,8],[-3,3],[-7,5],[-9,-6]],[[-4,-2],[0,2],[4,-2]],[[0,2],[0,6]]],
  [[[-10,-2],[-5,-7],[5,-7],[10,-2],[5,4],[2,4],[0,8],[-2,4],[-5,4],[-10,-2]],[[-5,-4],[5,-4],[0,3],[-5,-4]]],
  [[[-8,-8],[-3,-3],[3,-3],[8,-8],[8,5],[4,1],[0,7],[-4,1],[-8,5],[-8,-8]],[[-3,-3],[0,1],[3,-3]]],
  [[[0,-10],[5,-3],[3,0],[9,5],[5,7],[0,3],[-5,7],[-9,5],[-3,0],[-5,-3],[0,-10]],[[0,-6],[0,0]]],
  [[[-11,-5],[-6,-5],[-3,0],[0,-6],[3,0],[6,-5],[11,-5],[8,6],[3,4],[0,9],[-3,4],[-8,6],[-11,-5]],[[-6,0],[-6,3]],[[6,0],[6,3]]],
  [[[0,-9],[7,-5],[7,4],[0,9],[-7,4],[-7,-5],[0,-9]],[[-7,-5],[0,0],[7,-5]],[[0,0],[0,9]],[[-7,4],[0,0],[7,4]]],
  [[[-9,-7],[-4,-7],[-4,1],[0,5],[4,1],[4,-7],[9,-7],[9,5],[0,10],[-9,5],[-9,-7]],[[-2,-3],[2,-3],[2,1],[-2,1],[-2,-3]]],
  [[[-10,0],[-6,-6],[0,-3],[6,-6],[10,0],[6,6],[0,3],[-6,6],[-10,0]],[[-6,0],[0,-3],[6,0],[0,3],[-6,0]]],
];
const asteroid: Hull = [[[-8,-3],[-4,-8],[2,-7],[7,-3],[5,1],[7,5],[0,8],[-7,4],[-8,-3]],[[-4,-4],[-1,-2],[-3,2]],[[2,3],[4,4]]];
const player: Hull = [[[0,-12],[3,-4],[7,0],[7,6],[3,4],[0,7],[-3,4],[-7,6],[-7,0],[-3,-4],[0,-12]],[[0,-6],[0,1]],[[-3,4],[-3,8]],[[3,4],[3,8]]];

/** Native strokes keep diagonals smooth and the same width at every angle. */
function line(ctx: CanvasRenderingContext2D, color: string, x0: number, y0: number, x1: number, y1: number) {
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function outline(ctx: CanvasRenderingContext2D, hull: Hull, color: string, x: number, y: number, angle = 0, scale = 1) {
  const c = Math.cos(angle) * scale, s = Math.sin(angle) * scale;
  ctx.strokeStyle = color;
  ctx.beginPath();
  for (const path of hull) {
    path.forEach(([px, py], i) => {
      const tx = x + px * c - py * s, ty = y + px * s + py * c;
      if (i === 0) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    });
    const first = path[0], last = path[path.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) ctx.closePath();
  }
  ctx.stroke();
}

const wrap = (value: number, size: number) => ((value % size) + size) % size;
const shipScale = .8;

export const drawArcade: SceneRenderer = ({ ctx, width: w, height: h, time: t, compact }) => {
  rect(ctx, "#000000", 0, 0, w, h);
  // Three downward star speeds communicate vertical flight. No glow or gradients.
  for (let i = 0; i < (compact ? 48 : 120); i++) {
    const depth = i % 3;
    ctx.globalAlpha = .25 + depth * .2;
    rect(ctx, neon[i % neon.length], (i * 97 + i * i * 3) % w, wrap(i * 41 + t * (5 + depth * 9), h), 1, depth === 2 ? 2 : 1);
  }
  ctx.globalAlpha = 1;

  // Wireframe debris drifts through the field independently of enemy squadrons.
  for (let i = 0; i < (compact ? 3 : 7); i++) {
    outline(ctx, asteroid, neon[2], (i * 113 + 23) % w, wrap(i * 73 + t * 11, h + 40) - 20, t * .15 + i, .6 + i % 3 * .25);
  }

  const count = compact ? 12 : 28;
  for (let i = 0; i < count; i++) {
    const phase = t * (.07 + i % 3 * .012) + i * .173;
    const u = phase % 1;
    const lane = (i * .61803398875) % 1;
    let x: number, y: number, rotation = 0;
    switch (i % 4) {
      case 0: // Sine-wave dive.
        x = w * (.12 + lane * .76) + Math.sin(u * Math.PI * 4 + i) * w * .07;
        y = -20 + u * (h + 40);
        rotation = Math.cos(u * Math.PI * 4 + i) * .3;
        break;
      case 1: { // Circling squadron with a slow downward advance.
        const angle = t * .9 + i;
        x = w * (.16 + lane * .68) + Math.cos(angle) * w * .075;
        y = h * (.18 + lane * .58) + Math.sin(angle) * h * .12;
        rotation = Math.sin(angle) * .6;
        break;
      }
      case 2: // Angular zigzag, not another sinusoidal path.
        x = w * (.12 + lane * .76) + (Math.abs((u * 6 % 2) - 1) * 2 - 1) * w * .09;
        y = -20 + u * (h + 40);
        rotation = (Math.floor(u * 6) % 2 ? -.35 : .35);
        break;
      default: { // Parabolic attack arc entering from either edge.
        const side = i % 2 ? 1 : -1;
        x = w * .5 + side * (u - .5) * (w + 30);
        y = h * .2 + 4 * (u - .5) ** 2 * h * .68;
        rotation = (u - .5) * side;
      }
    }
    const color = neon[i % neon.length];
    outline(ctx, hulls[i % hulls.length], color, x, y, rotation, shipScale * (compact ? .65 : .75 + i % 3 * .12));
    rect(ctx, neon[(i + 3) % neon.length], x, y, 1, 2);

    // Short, staggered vertical and diagonal enemy bolts, never screen-wide flashes.
    const travel = (t * (.8 + i % 3 * .12) + i * .27) % 1;
    const diagonal = i % 3 - 1;
    const bx = x + diagonal * travel * 40, by = y + 10 + travel * 65;
    line(ctx, color, bx, by, bx + diagonal * 3, by + 5);
    if (!compact && i % 4 === 0) line(ctx, neon[5], x - diagonal * travel * 30, by + 10, x - diagonal * travel * 30 - diagonal * 2, by + 14);
  }

  const shipX = w * (.5 + Math.sin(t * .65) * .16), shipY = h * .86;
  const playerScale = shipScale * (compact ? .8 : 1);
  outline(ctx, player, neon[6], shipX, shipY, Math.sin(t * .65) * .1, playerScale);
  // Engine length changes without toggling visibility, avoiding rapid blinking.
  const exhaustEndY = shipY + (12 + Math.sin(t * 6) * 2) * playerScale;
  line(ctx, neon[5], shipX - 2 * playerScale, shipY + 9 * playerScale, shipX - 2 * playerScale, exhaustEndY);
  line(ctx, neon[3], shipX + 2 * playerScale, shipY + 9 * playerScale, shipX + 2 * playerScale, exhaustEndY);
  for (let i = 0; i < (compact ? 8 : 18); i++) {
    const travel = (t * .7 + i / (compact ? 8 : 18)) % 1;
    const spread = i % 3 - 1;
    const x = shipX + spread * travel * w * .2, y = shipY - 15 - travel * h * .76;
    line(ctx, i % 3 ? neon[4] : neon[6], x, y, x + spread * 2, y - 6);
  }

  // Localized impacts expand into debris. No global flash, shadow blur or particles retained in memory.
  for (let i = 0; i < (compact ? 2 : 5); i++) {
    const cycle = (t + i * 1.37) % 5.5;
    if (cycle > 1.1) continue;
    const progress = cycle / 1.1;
    const x = w * (.12 + (i * .237 % .76)), y = h * (.42 + i % 3 * .17);
    for (let ray = 0; ray < 10; ray++) {
      const angle = ray * Math.PI / 5 + i;
      const radius = 2 + progress * (compact ? 11 : 18);
      const length = (1 - progress) * 5;
      const color = neon[(ray + i) % neon.length];
      line(ctx, color, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, x + Math.cos(angle) * (radius + length), y + Math.sin(angle) * (radius + length));
    }
  }
};
