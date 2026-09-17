import { mulberry32, hashCode, PALETTES } from "@/features/virtual-tour/panorama";
import type { VirtualTourSceneKind } from "@/features/virtual-tour/types";

/**
 * Generador procedural de renders fotorrealistas (stills) — como la plataforma
 * de referencia genera sus imágenes con IA, nosotros las pintamos a mano en
 * canvas con luz, perspectiva y paleta coherente. Determinístico por `seed`.
 *
 * Salidas: exteriores del proyecto, interiores por ambiente, escenas de
 * galería (terraza, lobby, cowork, gimnasio, SUM) y thumbs por unidad.
 */

const cache = new Map<string, string>();

type Rect = { x: number; y: number; w: number; h: number };

function createCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx };
}

function toData(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/jpeg", 0.9);
}

function cached(key: string, make: () => { canvas: HTMLCanvasElement }) {
  const hit = cache.get(key);
  if (hit) return hit;
  const { canvas } = make();
  const url = toData(canvas);
  cache.set(key, url);
  return url;
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = (((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t) | 0;
  const g = (((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t) | 0;
  const bl = ((pa & 255) * (1 - t) + (pb & 255) * t) | 0;
  return `rgb(${r},${g},${bl})`;
}

function shade(color: string, amt: number): string {
  const p = parseInt(color.slice(1), 16);
  const f = amt >= 0 ? 1 - amt : 1;
  const k = amt >= 0 ? 0 : -amt;
  const r = (((p >> 16) & 255) * f + 255 * k) | 0;
  const g = (((p >> 8) & 255) * f + 255 * k) | 0;
  const b = ((p & 255) * f + 255 * k) | 0;
  return `rgb(${r},${g},${b})`;
}

function grain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rand: () => number,
  alpha = 0.05,
) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < Math.floor((w * h) / 900); i++) {
    ctx.fillStyle = rand() > 0.5 ? "#ffffff" : "#000000";
    ctx.fillRect(Math.floor(rand() * w), Math.floor(rand() * h), 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 0.5) {
  const g = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.35,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.75,
  );
  g.addColorStop(0, "rgba(5,7,14,0)");
  g.addColorStop(1, `rgba(5,7,14,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function vertGrad(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  stops: [number, string][],
) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [t, c] of stops) g.addColorStop(t, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function radial(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  stops: [number, string][],
) {
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  ctx.fillStyle = g;
  ctx.fillRect(cx - r1, cy - r1, r1 * 2, r1 * 2);
}

function rrect(ctx: CanvasRenderingContext2D, r: Rect, radius: number) {
  const { x, y, w, h } = r;
  const rr = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function glow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  alpha: number,
) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

/* ----------------------------------------------------------------------- */
/* Cielos y skyline (compartidos por exterior y galería)                    */
/* ----------------------------------------------------------------------- */

type SkyKind = "golden" | "day" | "dusk" | "night";

const SKY_STOPS: Record<SkyKind, [string, string, string, string]> = {
  golden: ["#1c2350", "#4d447f", "#b06464", "#f3b868"],
  day: ["#2f5f9e", "#6fa3d4", "#add2ec", "#e8f2f7"],
  dusk: ["#0b1030", "#35365f", "#7d4f7c", "#d98752"],
  night: ["#070a1e", "#141a38", "#2a3760", "#4a2f52"],
};

function skyStops(kind: SkyKind): [number, string][] {
  const colors = SKY_STOPS[kind];
  return [
    [0, colors[0]],
    [0.45, colors[1]],
    [0.75, colors[2]],
    [1, colors[3]],
  ];
}

function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, kind: SkyKind) {
  if (kind === "night") return;
  const core = kind === "golden" ? "#ffd98c" : kind === "dusk" ? "#f6a05c" : "#fff6d8";
  glow(ctx, x, y, r * 5, core.replace("#", "rgba(").replace(")", ",0.5)"), 0.5);
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (kind === "golden" || kind === "dusk") {
    const halo = ctx.createRadialGradient(x, y, r, x, y, r * 2.4);
    halo.addColorStop(0, "rgba(255,214,150,0.55)");
    halo.addColorStop(1, "rgba(255,214,150,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
  }
}

function drawClouds(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rand: () => number,
  kind: SkyKind,
) {
  if (kind === "night") return;
  const cloudColor = kind === "day" ? "rgba(255,255,255,0.9)" : "rgba(255,240,220,0.75)";
  for (let i = 0; i < 6; i++) {
    const cx = rand() * w;
    const cy = h * (0.05 + rand() * 0.28);
    const cw = w * (0.05 + rand() * 0.09);
    ctx.fillStyle = cloudColor;
    ctx.globalAlpha = 0.22 + rand() * 0.2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, cw * 0.34, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - cw * 0.6, cy + cw * 0.12, cw * 0.55, cw * 0.24, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + cw * 0.7, cy + cw * 0.1, cw * 0.5, cw * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSkyline(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bottom: number,
  rand: () => number,
  kind: SkyKind,
) {
  const sil =
    kind === "night"
      ? "#0a0e20"
      : kind === "dusk"
        ? "#241f3a"
        : kind === "golden"
          ? "#3a2f4d"
          : "#4a6c8c";
  const rows = kind === "day" ? 3 : 4;
  let y = bottom;
  for (let row = 0; row < rows; row++) {
    const rowH = h * (0.03 + rand() * 0.05);
    ctx.fillStyle = mix(sil, "#0d1220", row / rows);
    ctx.fillRect(0, y - rowH, w, rowH + 2);
    const cols = 10 + Math.floor(rand() * 6);
    const cw = w / cols;
    for (let c = 0; c < cols; c++) {
      const bh = rowH * (0.35 + rand() * 0.6);
      ctx.fillRect(c * cw, y - bh, cw * 0.72, bh);
    }
    y -= rowH + 2;
  }
  // Ventanas cálidas en la franja cercana.
  ctx.fillStyle =
    kind === "night" || kind === "dusk" ? "rgba(255,215,140,0.85)" : "rgba(255,255,255,0.4)";
  for (let i = 0; i < 60; i++) {
    if (rand() > 0.5) continue;
    const wx = rand() * w;
    const wy = bottom - 4 - rand() * h * 0.05;
    ctx.fillRect(wx, wy, 2.4, 3);
  }
}

/* ----------------------------------------------------------------------- */
/* Exterior del proyecto                                                    */
/* ----------------------------------------------------------------------- */

export type ExteriorVariant = "golden" | "day" | "dusk";

export function exteriorStill(variant: ExteriorVariant = "golden", seed = variant): string {
  return cached(`exterior:${variant}:${seed}`, () => {
    const w = 1600;
    const h = 900;
    const { ctx } = createCanvas(w, h);
    const rand = mulberry32(hashCode(`ext|${variant}|${seed}`));
    const streetY = h * 0.86;
    const horizon = h * 0.62;

    // Cielo.
    vertGrad(ctx, 0, 0, w, h, skyStops(variant));
    drawSun(ctx, w * 0.76, h * 0.34, h * 0.055, variant);
    drawClouds(ctx, w, h, rand, variant);
    drawSkyline(ctx, w, h, horizon, rand, variant);

    // Manzana / torre (centro derecho).
    const tower = {
      x: w * 0.52,
      w: w * 0.15,
      h: h * 0.56,
      base: streetY,
    };
    const tRight = tower.x + tower.w;
    const towerTop = tower.base - tower.h;

    // Relieve posterior (ala secundaria).
    const wing = {
      x: tower.x - tower.w * 0.5,
      w: tower.w * 0.95,
      h: tower.h * 0.72,
      top: tower.base - tower.h * 0.72,
      right: tower.x - tower.w * 0.5 + tower.w * 0.95,
    };
    vertGrad(ctx, wing.x, wing.top, wing.w, wing.h, [
      [0, variant === "day" ? "#5f86aa" : "#3a2f4d"],
      [1, "#0f1524"],
    ]);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    winGrid(ctx, wing.x, wing.top, wing.w, wing.h, 10, 18, rand, "rgba(255,255,255,0.35)", 0.55);

    // Torre principal.
    const glassGrad: [number, string][] =
      variant === "day"
        ? [
            [0, "#bfe0f4"],
            [0.35, "#7fb2d8"],
            [1, "#2b4a6e"],
          ]
        : [
            [0, "#ffd9a0"],
            [0.3, "#e89a5a"],
            [0.7, "#7a4a6e"],
            [1, "#1c2440"],
          ];
    vertGrad(ctx, tower.x, towerTop, tower.w, tower.h, glassGrad);

    // Pliegues de reflejo.
    const sheen = ctx.createLinearGradient(tower.x, towerTop, tRight, tower.base);
    sheen.addColorStop(0, "rgba(255,255,255,0)");
    sheen.addColorStop(0.35, "rgba(255,255,255,0.22)");
    sheen.addColorStop(0.5, "rgba(255,255,255,0)");
    sheen.addColorStop(0.75, "rgba(20,30,60,0.18)");
    ctx.fillStyle = sheen;
    ctx.fillRect(tower.x, towerTop, tower.w, tower.h);

    winGrid(ctx, tower.x, towerTop, tower.w, tower.h, 8, 14, rand, "rgba(255,255,255,0.4)", 0.5);

    // Terraza: parapeto + corona.
    ctx.fillStyle = "#20293a";
    ctx.fillRect(tower.x - 4, towerTop - 6, tower.w + 8, 8);
    ctx.fillStyle = "rgba(120,200,220,0.25)";
    ctx.fillRect(tower.x + tower.w * 0.22, towerTop - 5, tower.w * 0.56, 4);
    // Columnas de terraza.
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = "rgba(30,38,54,0.9)";
      ctx.fillRect(tower.x + 6 + (i * (tower.w - 12)) / 5 - 3, towerTop - 5, 6, tower.h * 0.1);
    }

    // Base / basamento.
    ctx.fillStyle = "#141b2a";
    ctx.fillRect(tower.x - 10, tower.base - h * 0.045, tower.w + 20, h * 0.045);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(tower.x - 10, tower.base - h * 0.045, tower.w + 20, 3);

    // Acceso con luz cálida.
    radial(ctx, tower.x + tower.w / 2, tower.base - h * 0.02, 4, w * 0.05, [
      [0, "rgba(255,214,150,0.6)"],
      [1, "rgba(255,214,150,0)"],
    ]);

    // Calle y vereda.
    vertGrad(ctx, 0, streetY, w, h - streetY, [
      [0, variant === "day" ? "#55616f" : "#262c3a"],
      [1, "#0c101a"],
    ]);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(0, streetY - 5, w, 5); // borde de vereda

    // Línea de calle.
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(w * 0.1, streetY + h * 0.02, w * 0.3, 3);
    ctx.fillRect(w * 0.45, streetY + h * 0.05, w * 0.25, 3);
    ctx.fillRect(w * 0.78, streetY + h * 0.02, w * 0.18, 3);

    // Árboles.
    for (let i = 0; i < 5; i++) {
      const tx = tower.x - tower.w * 1.15 - i * w * 0.055 - rand() * 30;
      const ty = streetY - h * 0.05;
      drawTree(ctx, tx, ty, h * (0.11 + rand() * 0.05), rand);
    }
    drawTree(ctx, tRight + w * 0.1, streetY - h * 0.05, h * 0.12, rand);
    drawTree(ctx, tRight + w * 0.2, streetY - h * 0.045, h * 0.1, rand);

    // Autos en sombra.
    for (let i = 0; i < 3; i++) {
      const cy = streetY + h * (0.07 + i * 0.02);
      drawCar(ctx, w * 0.08 + i * w * 0.2 + rand() * 40, cy, w * 0.09, rand, variant);
    }

    // Farolas con luz cálida.
    if (variant !== "day") {
      for (const fx of [w * 0.18, w * 0.68]) {
        ctx.fillStyle = "#1b2230";
        ctx.fillRect(fx - 2, streetY - h * 0.16, 4, h * 0.16);
        ctx.fillStyle = "#ffd98c";
        ctx.beginPath();
        ctx.arc(fx, streetY - h * 0.17, 4, 0, Math.PI * 2);
        ctx.fill();
        glow(ctx, fx, streetY - h * 0.15, w * 0.04, "rgba(255,210,130,0.5)", 0.24);
      }
    }

    vignette(ctx, w, h, 0.42);
    grain(ctx, w, h, rand, 0.04);
    return { canvas: ctx.canvas };
  });
}

function winGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cols: number,
  rows: number,
  rand: () => number,
  color: string,
  opacityChance: number,
) {
  ctx.save();
  ctx.globalAlpha = 0.9;
  const cw = w / cols;
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rand() > opacityChance) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5 + rand() * 0.4;
        ctx.fillRect(x + c * cw + cw * 0.28, y + r * rh + rh * 0.3, cw * 0.44, rh * 0.42);
      }
    }
  }
  ctx.fillStyle = "rgba(10,16,30,0.55)";
  for (let c = 0; c <= cols; c++) ctx.fillRect(x + c * cw - 1, y, 2, h);
  for (let r = 0; r <= rows; r++) ctx.fillRect(x, y + r * rh - 1, w, 2);
  ctx.restore();
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rand: () => number,
) {
  ctx.fillStyle = "#12161f";
  ctx.fillRect(x - 2, y - size * 0.7, 5, size * 0.36);
  const fr = ctx.createRadialGradient(x, y - size, 3, x, y - size, size * 0.72);
  const leaf = mix("#2d4a35", "#3d5c3c", rand());
  fr.addColorStop(0, mix(leaf, "#5d7a55", 0.4));
  fr.addColorStop(1, "#121f1a");
  ctx.fillStyle = fr;
  ctx.beginPath();
  ctx.arc(x, y - size * 0.62, size * 0.55, 0, Math.PI * 2);
  ctx.fill();
  glow(ctx, x, y, size * 0.3, "rgba(70,100,110,0.18)", 0.5);
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  rand: () => number,
  kind: ExteriorVariant,
) {
  const body = kind === "day" ? "#3a4757" : "#161c28";
  const colors = ["#2a3342", "#4a3a52", "#3a4a52"];
  ctx.fillStyle = colors[Math.floor(rand() * colors.length)] ?? "#2a3342";
  rrect(ctx, { x, y: y - len * 0.16, w: len, h: len * 0.22 }, 6);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x + len * 0.08, y - len * 0.3, len * 0.3, len * 0.16);
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(x + len * 0.62, y - len * 0.3, len * 0.3, len * 0.16);
  ctx.fillStyle = body;
  ctx.fillRect(x, y - len * 0.26, len, len * 0.3);
  // Ruedas.
  ctx.fillStyle = "#0a0c12";
  ctx.beginPath();
  ctx.arc(x + len * 0.18, y + len * 0.08, len * 0.1, 0, Math.PI * 2);
  ctx.arc(x + len * 0.82, y + len * 0.08, len * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

/* ----------------------------------------------------------------------- */
/* Interiores en perspectiva de un punto                                    */
/* ----------------------------------------------------------------------- */

export type InteriorKind = VirtualTourSceneKind;

export interface InteriorOpts {
  w?: number;
  h?: number;
}

export function interiorStill(
  kind: InteriorKind,
  seed: number | string,
  opts: InteriorOpts = {},
): string {
  const w = opts.w ?? 1280;
  const h = opts.h ?? 720;
  const seedKey = `${kind}|${seed}`;
  return cached(`interior:${seedKey}:${w}x${h}`, () => {
    const { ctx } = createCanvas(w, h);
    const rand = mulberry32(hashCode(seedKey));
    paintInterior(ctx, w, h, kind, rand);
    return { canvas: ctx.canvas };
  });
}

function paintInterior(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  kind: InteriorKind,
  rand: () => number,
) {
  const pal = PALETTES[kind];
  const vpX = w * 0.5;
  const hor = h * 0.47;
  const top = h * 0.1;
  const bw = w * 0.62;
  const bx = (w - bw) / 2;

  // Pared de fondo.
  vertGrad(ctx, bx, top, bw, hor - top, [
    [0, pal.ceiling],
    [0.35, pal.wall],
    [1, mix(pal.wall, "#000000", 0.42)],
  ]);

  // Paredes laterales con perspectiva.
  const leftG = ctx.createLinearGradient(0, 0, bx, 0);
  leftG.addColorStop(0, mix(pal.wall, "#000000", 0.62));
  leftG.addColorStop(1, pal.wall);
  // Polígono izquierdo: techo derecho de fondo.
  ctx.fillStyle = leftG;
  ctx.beginPath();
  ctx.moveTo(bx, top);
  ctx.lineTo(0, 0);
  ctx.lineTo(0, h);
  ctx.lineTo(bx, hor);
  ctx.closePath();
  ctx.fill();
  // Suavizado superior.
  const leftCeil = ctx.createLinearGradient(0, 0, bx, top);
  leftCeil.addColorStop(0, mix(pal.ceiling, "#000000", 0.3));
  leftCeil.addColorStop(1, pal.wall);
  ctx.fillStyle = leftCeil;
  ctx.beginPath();
  ctx.moveTo(bx, top);
  ctx.lineTo(0, 0);
  ctx.lineTo(bx * 0.55, 0);
  ctx.closePath();
  ctx.fill();

  const rightG = ctx.createLinearGradient(w, 0, bx + bw, 0);
  rightG.addColorStop(0, mix(pal.wall, "#000000", 0.62));
  rightG.addColorStop(1, pal.wall);
  ctx.fillStyle = rightG;
  ctx.beginPath();
  ctx.moveTo(bx + bw, top);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h);
  ctx.lineTo(bx + bw, hor);
  ctx.closePath();
  ctx.fill();
  const rightCeil = ctx.createLinearGradient(w, 0, bx + bw, top);
  rightCeil.addColorStop(0, mix(pal.ceiling, "#000000", 0.3));
  rightCeil.addColorStop(1, pal.wall);
  ctx.fillStyle = rightCeil;
  ctx.beginPath();
  ctx.moveTo(bx + bw, top);
  ctx.lineTo(w, 0);
  ctx.lineTo(bx + bw + (w - bx - bw) * 0.45, 0);
  ctx.closePath();
  ctx.fill();

  // Techo.
  vertGrad(ctx, bx, 0, bw, top + 2, [
    [0, mix(pal.ceiling, "#000000", 0.18)],
    [1, pal.ceiling],
  ]);
  const ceilGlow = ctx.createRadialGradient(vpX, h * 0.05, h * 0.03, vpX, h * 0.05, h * 0.24);
  ceilGlow.addColorStop(0, "rgba(250,226,160,0.5)");
  ceilGlow.addColorStop(1, "rgba(250,226,160,0)");
  ctx.fillStyle = ceilGlow;
  ctx.fillRect(bx, 0, bw, hor);
  // Fila de downlights.
  for (let i = 0; i < 5; i++) {
    const lx = bx + 14 + i * ((bw - 28) / 4);
    ctx.fillStyle = "rgba(250,226,160,0.9)";
    ctx.beginPath();
    ctx.arc(lx, h * 0.045, 3.4, 0, Math.PI * 2);
    ctx.fill();
    glow(ctx, lx, h * 0.045, h * 0.06, "rgba(250,226,160,0.5)", 0.35);
  }

  // Piso.
  vertGrad(ctx, bx, hor, bw, h - hor, [
    [0, "#3a3f4d"],
    [0.15, pal.floor],
    [1, mix(pal.floor, "#000000", 0.55)],
  ]);
  ctx.save();
  const pp = ctx.createLinearGradient(0, hor, 0, h);
  pp.addColorStop(0, "rgba(0,0,0,0.4)");
  pp.addColorStop(1, "rgba(0,0,0,0.05)");
  ctx.fillStyle = pp;
  ctx.beginPath();
  ctx.moveTo(bx, hor);
  ctx.lineTo(bx + bw, hor);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  // Tablones radiantes.
  ctx.strokeStyle = pal.floorLine;
  ctx.lineWidth = 2;
  for (let i = 1; i < 14; i++) {
    const t = i / 14;
    const y = hor + (h - hor) * t * t;
    const hwRow = (w - bw) * t + bw / 2;
    ctx.globalAlpha = 0.55 * t;
    ctx.beginPath();
    ctx.moveTo(vpX - hwRow, y);
    ctx.lineTo(vpX + hwRow, y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(bx, hor, 3, 2); // zócalo sombra
  ctx.fillStyle = pal.trim;
  ctx.fillRect(bx, hor - 4, bw, 4);

  // Luz de ventana sobre el piso.
  glow(ctx, vpX, hor + h * 0.02, w * 0.22, "rgba(240,214,140,0.5)", 0.5);
  glow(ctx, vpX, hor + h * 0.02, w * 0.11, "rgba(255,240,200,0.5)", 0.22);

  if (kind === "balcony") {
    paintBalconyInterior(ctx, w, h, rand);
  } else {
    paintWindow(ctx, w, h, rand, kind);
  }

  // Acento cálido en pared de fondo.
  const wallTint = ctx.createLinearGradient(0, top, 0, hor);
  wallTint.addColorStop(0, "rgba(255,220,150,0.08)");
  wallTint.addColorStop(1, "rgba(255,220,150,0)");
  ctx.fillStyle = wallTint;
  ctx.fillRect(bx, top, bw, hor - top);

  switch (kind) {
    case "living":
      paintLiving(ctx, w, h, rand);
      break;
    case "kitchen":
      paintKitchen(ctx, w, h, rand);
      break;
    case "bedroom":
      paintBedroom(ctx, w, h, rand);
      break;
    case "bath":
      paintBath(ctx, w, h, rand);
      break;
    default:
      break;
  }

  vignette(ctx, w, h, 0.5);
  grain(ctx, w, h, rand, 0.045);
}

function paintWindow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rand: () => number,
  kind: InteriorKind,
) {
  const hor = h * 0.47;
  const top = h * 0.1;
  const nw = w * 0.42;
  const nx = (w - nw) / 2;
  const ny = top + h * 0.04;
  const nh = hor - ny - h * 0.02;

  const sky = ctx.createLinearGradient(0, ny, 0, ny + nh);
  sky.addColorStop(0, "#7fb0e0");
  sky.addColorStop(0.55, "#cfe3f2");
  sky.addColorStop(1, mix(kind === "bedroom" ? "#ffc98a" : "#f5d9a0", "#cfe3f2", 0.5));
  ctx.fillStyle = sky;
  ctx.fillRect(nx, ny, nw, nh);
  skylineWindow(ctx, nx, ny, nw, nh, rand);

  // Marco.
  ctx.strokeStyle = "#0e1420";
  ctx.lineWidth = Math.max(4, h * 0.012);
  ctx.strokeRect(nx, ny, nw, nh);
  ctx.strokeStyle = "#3b4457";
  ctx.lineWidth = Math.max(1.5, h * 0.005);
  ctx.strokeRect(nx + 4, ny + 4, nw - 8, nh - 8);
  // Travesaños.
  ctx.strokeStyle = "#151b28";
  ctx.lineWidth = Math.max(3, h * 0.008);
  ctx.beginPath();
  ctx.moveTo(nx, ny + nh * 0.4);
  ctx.lineTo(nx + nw, ny + nh * 0.4);
  ctx.moveTo(nx + nw * 0.5, ny);
  ctx.lineTo(nx + nw * 0.5, ny + nh);
  ctx.stroke();

  // Reflejo.
  const sheen = ctx.createLinearGradient(nx, ny, nx + nw, ny + nh);
  sheen.addColorStop(0, "rgba(255,255,255,0.28)");
  sheen.addColorStop(0.35, "rgba(255,255,255,0)");
  sheen.addColorStop(0.7, "rgba(120,150,190,0.18)");
  ctx.fillStyle = sheen;
  ctx.fillRect(nx, ny, nw, nh);
}

function skylineWindow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rand: () => number,
) {
  const g = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.2, "rgba(200,220,235,0.5)");
  g.addColorStop(1, "rgba(90,110,140,0.8)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
  // Silueta.
  ctx.fillStyle = "#5a6b7e";
  for (let i = 0; i < 8; i++) {
    const cw = w / 8;
    const bh = h * (0.12 + rand() * 0.24);
    ctx.fillRect(x + i * cw, y + h * 0.62 - bh, cw * 0.8, bh);
  }
}

function paintBalconyInterior(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rand: () => number,
) {
  const hor = h * 0.47;
  const top = h * 0.1;
  const railingTop = hor - h * 0.08;
  // Vista de ciudad abierta arriba.
  vertGrad(ctx, 0, 0, w, railingTop, skyStops("golden"));
  drawSun(ctx, w * 0.68, h * 0.2, h * 0.045, "golden");
  drawSkyline(ctx, w, h, railingTop, rand, "golden");
  // Baranda de vidrio.
  ctx.fillStyle = "rgba(140,170,200,0.35)";
  ctx.fillRect(0, railingTop, w, hor - railingTop);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  for (let x = 0; x < w; x += w * 0.06) {
    ctx.fillRect(x, railingTop - h * 0.004, 3, h * 0.004);
  }
  // Pasamanos.
  ctx.fillStyle = "#c8cdd6";
  ctx.fillRect(0, railingTop - 3, w, 5);
  ctx.fillRect(0, hor - 4, w, 5);
  // Corrimiento.
  for (let i = 0; i < 22; i++) {
    const px = (i / 21) * w;
    ctx.fillStyle = "#37404f";
    ctx.fillRect(px, railingTop, 5, hor - railingTop);
  }
  // Mesa + banco.
  drawTableAndChairs(ctx, w, h, rand);
  // Plantas.
  drawPlant(ctx, w * 0.12, hor, w * 0.07);
  void top;
}

function drawTableAndChairs(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rand: () => number,
) {
  const hor = h * 0.47;
  const cx = w * 0.62;
  const tableW = w * 0.26;
  const tableH = h * 0.05;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx, hor + h * 0.26, tableW * 0.86, h * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
  vertGrad(ctx, cx - tableW / 2, hor - tableH, tableW, tableH, [
    [0, shade("#3a3f49", 0.15)],
    [1, "#242830"],
  ]);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(cx - tableW / 2, hor - tableH, tableW, 2.5);
  const legθ = Math.min(w * 0.06, 60);
  ctx.fillStyle = "#21252c";
  ctx.fillRect(cx - tableW / 2 + 3, hor - tableH + 3, 4, h * 0.05);
  ctx.fillRect(cx + tableW / 2 - 7, hor - tableH + 3, 4, h * 0.05);
  // Sillas.
  for (const sx of [cx - tableW * 0.62, cx + tableW * 0.42]) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(sx + legθ * 0.6, hor + h * 0.16, legθ * 0.8, h * 0.02, 0, 0, Math.PI * 2);
    ctx.fill();
    vertGrad(ctx, sx, hor - tableH + 2, legθ, h * 0.13, [
      [0, shade("#333844", 0.1)],
      [1, "#1c2028"],
    ]);
    vertGrad(ctx, sx, hor - tableH - h * 0.01, legθ, h * 0.06, [
      [0, "#454c5c"],
      [1, "#262b34"],
    ]);
  }
  // Sombrilla.
  const ux = cx + tableW * 0.36;
  const uy = hor - tableH - h * 0.12;
  const ur = tableW * 0.8;
  ctx.strokeStyle = "#20242c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ux, uy + ur * 0.9);
  ctx.lineTo(ux, uy);
  ctx.stroke();
  const umbrella = ctx.createRadialGradient(ux, uy, ur * 0.1, ux, uy, ur);
  umbrella.addColorStop(0, mix("#c8cdd6", "#ffffff", 0.35));
  umbrella.addColorStop(1, "#3a3f49");
  ctx.fillStyle = umbrella;
  ctx.beginPath();
  ctx.moveTo(ux, uy);
  ctx.arc(ux, uy, ur, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let i = 0; i < 6; i++) {
    const a = Math.PI - (i / 5) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(ux, uy);
    ctx.lineTo(ux + Math.cos(a) * ur, uy + Math.sin(a) * ur);
    ctx.lineTo(ux + Math.cos(a) * ur * 0.9, uy);
    ctx.closePath();
    ctx.fill();
  }
  void rand;
}

/* ------------------------- Muebles por ambiente ------------------------ */

function drawRugPersp(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, ry: number) {
  const hor = h * 0.47;
  ctx.fillStyle = "rgba(120,100,75,0.5)";
  ctx.beginPath();
  ctx.ellipse(cx, hor + h * 0.14, w * 0.14, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(220,190,130,0.4)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(cx, hor + h * 0.14, w * 0.105, ry * 0.72, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawFloorLamp(ctx: CanvasRenderingContext2D, x: number, groundY: number, height: number) {
  ctx.fillStyle = "#1c2028";
  ctx.fillRect(x - 2, groundY - height, 5, height);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, groundY, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  const shadeW = 16;
  ctx.fillStyle = "#c8a05c";
  ctx.beginPath();
  ctx.moveTo(x - shadeW, groundY - height);
  ctx.lineTo(x + shadeW, groundY - height);
  ctx.lineTo(x + shadeW * 0.6, groundY - height + 12);
  ctx.lineTo(x - shadeW * 0.6, groundY - height + 12);
  ctx.closePath();
  ctx.fill();
  glow(ctx, x, groundY - height + 4, 90, "rgba(255,220,150,0.8)", 0.5);
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, groundY: number, size: number) {
  ctx.fillStyle = "#151921";
  rrect(ctx, { x: x - size * 0.18, y: groundY - size * 0.34, w: size * 0.36, h: size * 0.2 }, 4);
  ctx.fill();
  const leaf = ctx.createRadialGradient(x, groundY - size, size * 0.1, x, groundY - size, size);
  leaf.addColorStop(0, "#3f6b46");
  leaf.addColorStop(0.65, "#25492e");
  leaf.addColorStop(1, "#12241a");
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.ellipse(x, groundY - size, size * 0.6, size, 0, Math.PI, 0);
  ctx.fill();
}

function drawWallArt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rand: () => number,
  accent: string,
) {
  ctx.fillStyle = "#12151f";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#20242e";
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  const art = ctx.createLinearGradient(x, y + 3, x + w, y + h);
  art.addColorStop(0, accent);
  art.addColorStop(0.5, rand() > 0.5 ? "#e8c66e" : accent);
  art.addColorStop(1, "#8f97a8");
  ctx.fillStyle = art;
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = "#0d0f16";
  ctx.lineWidth = 4;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 12 + (i * (h - 20)) / 2 + rand() * 8);
    ctx.bezierCurveTo(
      x + w * 0.3,
      y + 6 + (i * (h - 14)) / 2,
      x + w * 0.6,
      y + (h - 10) * (0.6 + i * 0.15),
      x + w - 6,
      y + 10 + (i * (h - 18)) / 2,
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function paintLiving(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) {
  const hor = h * 0.47;
  const pal = PALETTES.living;

  drawRugPersp(ctx, w, h, w * 0.5, h * 0.045);

  // Sofá (fondo).
  const sofaW = w * 0.3;
  const sofaX = w * 0.5 - sofaW / 2;
  const sofaY = hor - h * 0.11;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(sofaX + sofaW / 2, sofaY + h * 0.045, sofaW * 0.7, h * 0.02, 0, 0, Math.PI * 2);
  ctx.fill();
  vertGrad(ctx, sofaX, sofaY, sofaW, h * 0.045, [
    [0, "#4a3a52"],
    [1, mix("#4a3a52", "#000000", 0.5)],
  ]);
  vertGrad(ctx, sofaX, sofaY - h * 0.055, sofaW, h * 0.055, [
    [0, mix("#5a4a66", "#ffffff", 0.12)],
    [1, "#3a2f44"],
  ]);
  vertGrad(ctx, sofaX - h * 0.035, sofaY - h * 0.055, h * 0.038, h * 0.1, [
    [0, "#4a3a52"],
    [1, "#2a2133"],
  ]);
  vertGrad(ctx, sofaX + sofaW, sofaY - h * 0.055, h * 0.038, h * 0.1, [
    [0, "#4a3a52"],
    [1, "#2a2133"],
  ]);
  // Almohadones.
  ctx.fillStyle = "#e8c66e";
  rrect(ctx, { x: sofaX + sofaW * 0.4, y: sofaY - h * 0.05, w: sofaW * 0.2, h: h * 0.045 }, 5);
  ctx.fill();
  ctx.fillStyle = "#6b7588";
  rrect(ctx, { x: sofaX + sofaW * 0.64, y: sofaY - h * 0.048, w: sofaW * 0.18, h: h * 0.042 }, 5);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.moveTo(sofaX + 6, sofaY + i * h * 0.022);
    ctx.lineTo(sofaX + sofaW - 6, sofaY + i * h * 0.022);
    ctx.stroke();
  }

  // Mesa ratona.
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(w * 0.5, hor + h * 0.13, w * 0.09, h * 0.02, 0, 0, Math.PI * 2);
  ctx.fill();
  vertGrad(ctx, w * 0.5 - w * 0.07, hor + h * 0.015, w * 0.14, h * 0.008, [
    [0, "#7a5b3c"],
    [1, "#3c2e1f"],
  ]);
  ctx.fillStyle = "#2a2118";
  ctx.fillRect(w * 0.5 - w * 0.015, hor + h * 0.02, 4, h * 0.1);
  ctx.fillRect(w * 0.5 + w * 0.01, hor + h * 0.02, 4, h * 0.1);

  // Consola / TV.
  const tvW = w * 0.22;
  const tvX = w * 0.5 - tvW / 2;
  vertGrad(ctx, tvX, hor - h * 0.075, tvW, h * 0.05, [
    [0, "#262b38"],
    [1, "#12151c"],
  ]);
  ctx.fillStyle = "#11141b";
  ctx.fillRect(tvX + tvW * 0.02, hor - h * 0.12, tvW * 0.96, h * 0.048);
  const tvGlow = ctx.createLinearGradient(0, hor - h * 0.118, 0, hor - h * 0.075);
  tvGlow.addColorStop(0, "rgba(140,160,200,0.5)");
  tvGlow.addColorStop(1, "rgba(140,160,200,0.08)");
  ctx.fillStyle = tvGlow;
  ctx.fillRect(tvX + tvW * 0.02, hor - h * 0.12, tvW * 0.96, h * 0.048);

  // Cuadro.
  drawWallArt(ctx, w * 0.12, h * 0.2, w * 0.1, h * 0.16, rand, pal.trim);

  // Lámpara de piso + planta.
  drawFloorLamp(ctx, w * 0.84, hor, h * 0.22);
  drawPlant(ctx, w * 0.88, hor, h * 0.09);
}

function paintKitchen(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) {
  const hor = h * 0.47;
  const pal = PALETTES.kitchen;

  // Mesada inferior a lo largo del fondo.
  const counterW = w * 0.62;
  const counterX = (w - counterW) / 2;
  const counterTop = hor - h * 0.03;
  vertGrad(ctx, counterX, counterTop, counterW, h * 0.09, [
    [0, "#3f4550"],
    [1, mix("#3f4550", "#000000", 0.5)],
  ]);
  // Cubierta de mármol.
  vertGrad(ctx, counterX, counterTop - h * 0.013, counterW, h * 0.015, [
    [0, "#d8d3c8"],
    [1, "#a8a494"],
  ]);
  // Puertas de alacena inferior.
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(
      counterX + 6 + i * ((counterW - 12) / 4),
      counterTop + h * 0.008,
      (counterW - 12) / 4 - 4,
      h * 0.064,
    );
  }
  // Tiradores.
  ctx.fillStyle = "rgba(255,220,150,0.8)";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(
      counterX + 6 + i * ((counterW - 12) / 4) + ((counterW - 12) / 4 - 4) / 2,
      counterTop + h * 0.03,
      6,
      2.5,
    );
  }

  // Alacena superior.
  vertGrad(ctx, counterX, h * 0.13, counterW, h * 0.1, [
    [0, mix("#2c3b40", "#ffffff", 0.05)],
    [1, "#22262e"],
  ]);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(
      counterX + 6 + i * ((counterW - 12) / 4),
      h * 0.148,
      (counterW - 12) / 4 - 4,
      h * 0.065,
    );
  }

  // Bacha + canilla.
  ctx.fillStyle = "#a8a494";
  ctx.fillRect(w * 0.5 - w * 0.026, counterTop - h * 0.012, w * 0.05, h * 0.011);
  ctx.fillStyle = "#c8cdd6";
  ctx.beginPath();
  ctx.arc(w * 0.5, counterTop - h * 0.014, h * 0.004, Math.PI, 0);
  ctx.fill();

  // Heladera lateral.
  const friW = w * 0.09;
  const friX = w * 0.5 + counterW / 2 - friW * 0.3;
  vertGrad(ctx, friX, hor - h * 0.16, friW, h * 0.16, [
    [0, "#48505c"],
    [1, mix("#48505c", "#000000", 0.45)],
  ]);
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 2;
  ctx.strokeRect(friX + 3, hor - h * 0.155, friW - 6, h * 0.07);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(friX + friW * 0.12, hor - h * 0.145 + i * h * 0.022, friW * 0.76, h * 0.014);
  }

  // Lámparas colgantes.
  for (const lx of [w * 0.36, w * 0.5, w * 0.64]) {
    ctx.strokeStyle = "#434a55";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, h * 0.042);
    ctx.lineTo(lx, h * 0.11);
    ctx.stroke();
    const lamp = ctx.createRadialGradient(lx, h * 0.115, 2, lx, h * 0.115, h * 0.035);
    lamp.addColorStop(0, "#ffd98c");
    lamp.addColorStop(1, "#7a5a2a");
    ctx.fillStyle = lamp;
    ctx.beginPath();
    ctx.arc(lx, h * 0.115, h * 0.028, 0, Math.PI * 2);
    ctx.fill();
    glow(ctx, lx, h * 0.115, h * 0.12, "rgba(255,220,150,0.6)", 0.4);
  }

  // Banqueta.
  drawStool(ctx, w * 0.5 - w * 0.12, hor);
  drawStool(ctx, w * 0.5 - w * 0.045, hor);

  drawWallArt(ctx, w * 0.13, h * 0.22, w * 0.08, h * 0.12, rand, pal.trim);
  void pal;
}

function drawStool(ctx: CanvasRenderingContext2D, x: number, groundY: number) {
  vertGrad(ctx, x - 12, groundY - 20, 24, 12, [
    [0, "#4a3a52"],
    [1, "#241d2c"],
  ]);
  ctx.fillStyle = "#1c2129";
  ctx.fillRect(x - 2.5, groundY - 14, 5, 12);
  ctx.fillStyle = "#3a3f49";
  ctx.fillRect(x - 9, groundY - 4, 18, 4);
}

function paintBedroom(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) {
  const hor = h * 0.47;
  const pal = PALETTES.bedroom;

  drawRugPersp(ctx, w, h, w * 0.5, h * 0.04);

  // Cama central.
  const bedW = w * 0.34;
  const bedX = w * 0.5 - bedW / 2;
  const bedTop = hor - h * 0.045;
  // Cabecera.
  vertGrad(ctx, bedX, hor - h * 0.1, bedW, h * 0.1, [
    [0, mix("#3c4858", "#ffffff", 0.08)],
    [1, "#1c2230"],
  ]);
  // Colchón.
  vertGrad(ctx, bedX + bedW * 0.015, bedTop, bedW * 0.97, h * 0.04, [
    [0, "#e8e4dc"],
    [1, "#9f9a90"],
  ]);
  // Frazada.
  vertGrad(ctx, bedX + bedW * 0.015, bedTop + h * 0.013, bedW * 0.97, h * 0.03, [
    [0, "#2d4a4f"],
    [1, mix("#2d4a4f", "#000000", 0.45)],
  ]);
  // Almohadas.
  ctx.fillStyle = "#f2efe9";
  rrect(ctx, { x: bedX + bedW * 0.06, y: bedTop - h * 0.03, w: bedW * 0.24, h: h * 0.032 }, 8);
  ctx.fill();
  rrect(ctx, { x: bedX + bedW * 0.34, y: bedTop - h * 0.03, w: bedW * 0.24, h: h * 0.032 }, 8);
  ctx.fill();

  // Mesas de luz.
  for (const nX of [bedX - w * 0.03, bedX + bedW + w * 0.03 - w * 0.04]) {
    vertGrad(ctx, nX, hor - h * 0.045, w * 0.04, h * 0.05, [
      [0, "#3c4858"],
      [1, "#1a1f2c"],
    ]);
    ctx.fillStyle = "#ffd98c";
    ctx.beginPath();
    ctx.arc(nX + w * 0.02, hor - h * 0.05, h * 0.006, 0, Math.PI * 2);
    ctx.fill();
    glow(ctx, nX + w * 0.02, hor - h * 0.05, w * 0.03, "rgba(255,220,150,0.7)", 0.5);
  }

  // Placard.
  vertGrad(ctx, w * 0.06, h * 0.16, w * 0.11, hor - h * 0.16, [
    [0, "#2c3038"],
    [1, mix("#2c3038", "#000000", 0.4)],
  ]);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(w * 0.06 + 3, h * 0.162, w * 0.11 - 6, hor - h * 0.162);
  ctx.beginPath();
  ctx.moveTo(w * 0.115, h * 0.162);
  ctx.lineTo(w * 0.115, hor - h * 0.004);
  ctx.stroke();

  drawWallArt(ctx, w * 0.78, h * 0.2, w * 0.09, h * 0.14, rand, pal.trim);
  drawFloorLamp(ctx, w * 0.13, hor, h * 0.2);
}

function paintBath(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) {
  const hor = h * 0.47;
  const pal = PALETTES.bath;

  // Vanitory + espejo.
  const vanW = w * 0.26;
  const vanX = w * 0.5 - vanW / 2;
  ctx.fillStyle = "#1c2230";
  rrect(ctx, { x: vanX, y: hor - h * 0.035, w: vanW, h: h * 0.05 }, 4);
  ctx.fill();
  vertGrad(ctx, vanX, hor - h * 0.035, vanW, h * 0.012, [
    [0, "#d8d3c8"],
    [1, "#b5b09f"],
  ]);
  // Espejo con luz.
  ctx.fillStyle = "#141824";
  rrect(ctx, { x: vanX, y: h * 0.2, w: vanW, h: h * 0.16 }, 4);
  ctx.fill();
  const mirGrad = ctx.createLinearGradient(vanX, h * 0.2, vanX + vanW, h * 0.2 + h * 0.16);
  mirGrad.addColorStop(0, "#9fb4cf");
  mirGrad.addColorStop(0.5, "#cfdae8");
  mirGrad.addColorStop(1, "#c8d2df");
  ctx.fillStyle = mirGrad;
  rrect(ctx, { x: vanX + 3, y: h * 0.203, w: vanW - 6, h: h * 0.154 }, 3);
  ctx.fill();
  glow(ctx, vanX + vanW / 2, h * 0.185, w * 0.05, "rgba(235,240,250,0.7)", 0.55);
  // Canilla.
  ctx.fillStyle = "#c8cdd6";
  ctx.beginPath();
  ctx.arc(vanX + vanW / 2, hor - h * 0.027, h * 0.005, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(vanX + vanW / 2 - 1.5, hor - h * 0.036, 3, h * 0.01);

  // Tina.
  vertGrad(ctx, w * 0.12, hor - h * 0.08, w * 0.24, h * 0.085, [
    [0, "#dfe6ee"],
    [1, "#aab6c6"],
  ]);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  rrect(ctx, { x: w * 0.138, y: hor - h * 0.068, w: w * 0.204, h: h * 0.03 }, 12);
  ctx.fill();

  // Banco + toalla.
  vertGrad(ctx, w * 0.78, hor - h * 0.06, w * 0.1, h * 0.065, [
    [0, "#2c3138"],
    [1, "#14171d"],
  ]);
  ctx.fillStyle = "#b0524a";
  ctx.fillRect(w * 0.79, hor - h * 0.052, w * 0.08, h * 0.016);

  // Mosaico en pared (sutil).
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rand() > 0.5 ? "#ffffff" : "#000000";
    const mx = (hashCode(`tile${i}`) % 1000) / 1000;
    const my = (hashCode(`tileY${i}`) % 1000) / 1000;
    ctx.fillRect(mx * w, h * 0.16 + my * (hor - h * 0.16), 6, 6);
  }
  ctx.globalAlpha = 1;

  drawWallArt(ctx, w * 0.42, h * 0.22, w * 0.07, h * 0.11, rand, pal.trim);
}

/* ----------------------------------------------------------------------- */
/* Galería (amenities)                                                      */
/* ----------------------------------------------------------------------- */

export type GallerySceneId = "rooftop" | "lobby" | "cowork" | "gym" | "sum";

export const GALLERY_SCENES: { id: GallerySceneId; label: string }[] = [
  { id: "rooftop", label: "Terraza con pileta" },
  { id: "lobby", label: "Lobby de recepción" },
  { id: "cowork", label: "Coworking" },
  { id: "gym", label: "Gimnasio" },
  { id: "sum", label: "Salón de usos múltiples" },
];

export function galleryStill(id: GallerySceneId, seed = id): string {
  return cached(`gallery:${id}:${seed}`, () => {
    const w = 1280;
    const h = 800;
    const { ctx } = createCanvas(w, h);
    const rand = mulberry32(hashCode(`gal|${id}|${seed}`));
    switch (id) {
      case "rooftop":
        paintRooftop(ctx, w, h, rand);
        break;
      case "lobby":
        paintLobby(ctx, w, h, rand);
        break;
      case "cowork":
        paintCowork(ctx, w, h, rand);
        break;
      case "gym":
        paintGym(ctx, w, h, rand);
        break;
      case "sum":
        paintSum(ctx, w, h, rand);
        break;
    }
    vignette(ctx, w, h, 0.45);
    grain(ctx, w, h, rand, 0.045);
    return { canvas: ctx.canvas };
  });
}

function paintRooftop(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) {
  const horizon = h * 0.52;
  vertGrad(ctx, 0, 0, w, horizon, skyStops("dusk"));
  drawSun(ctx, w * 0.3, h * 0.3, h * 0.05, "dusk");
  drawClouds(ctx, w, h, rand, "dusk");
  drawSkyline(ctx, w, h, horizon, rand, "dusk");

  // Piso de terraza.
  vertGrad(ctx, 0, horizon, w, h - horizon, [
    [0, "#4a4038"],
    [1, "#191511"],
  ]);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < 20; i++) {
    ctx.fillRect(0, horizon + (h - horizon) * (i / 20), w, 1.5);
  }

  // Baranda de vidrio con luces.
  ctx.fillStyle = "rgba(140,170,210,0.3)";
  ctx.fillRect(0, horizon - 6, w, 8);
  ctx.fillStyle = "#c8cdd6";
  ctx.fillRect(0, horizon - 8, w, 3);
  ctx.fillStyle = "rgba(255,215,140,0.9)";
  for (let x = 0; x < w; x += 40) ctx.fillRect(x, horizon - 12, 3, 3);

  // Pileta.
  const pool = { x: w * 0.14, y: horizon + h * 0.06, w: w * 0.42, h: h * 0.16 };
  vertGrad(ctx, pool.x, pool.y, pool.w, pool.h, [
    [0, "#63b7cf"],
    [0.4, "#2e86ab"],
    [1, "#14506b"],
  ]);
  const waterLine = ctx.createLinearGradient(pool.x, pool.y, pool.x + pool.w, pool.y + pool.h);
  waterLine.addColorStop(0, "rgba(255,255,255,0.75)");
  waterLine.addColorStop(0.2, "rgba(255,255,255,0)");
  ctx.fillStyle = waterLine;
  ctx.fillRect(pool.x, pool.y, pool.w, pool.h * 0.25);
  // Reflejos sol.
  ctx.fillStyle = "rgba(255,215,140,0.4)";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.ellipse(
      pool.x + pool.w / 2 + rand() * 40 - 20,
      pool.y + pool.h * 0.32 + i * 8,
      30 - i * 2,
      3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = "#dfe6ee";
  ctx.fillRect(pool.x - 5, pool.y - 4, pool.w + 10, 5);

  // Lozas (reposeras).
  for (const lx of [w * 0.68, w * 0.82]) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(lx, horizon + h * 0.16, w * 0.06, h * 0.02, -0.12, 0, Math.PI * 2);
    ctx.fill();
    vertGrad(ctx, lx - 20, horizon + h * 0.05, 40, h * 0.11, [
      [0, "#f2efe6"],
      [1, "#9a968c"],
    ]);
    ctx.save();
    ctx.translate(lx, horizon + h * 0.05);
    ctx.rotate(0.1);
    vertGrad(ctx, -40, 0, 80, 12, [
      [0, "#f2efe6"],
      [1, "#c6c2b8"],
    ]);
    ctx.restore();
  }

  // Sombrilla.
  ctx.strokeStyle = "#1c2028";
  ctx.lineWidth = 5;
  ctx.fillStyle = "#1c2028";
  ctx.beginPath();
  for (let i = 0; i < 20; i++) {
    const a = Math.PI * (i / 19);
    const r = w * 0.07;
    const px = w * 0.74 + Math.cos(a) * r;
    const py = horizon + h * 0.07 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.fillStyle = "#c8b390";
  ctx.beginPath();
  ctx.arc(w * 0.74, horizon + h * 0.07 + 4, w * 0.07, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  for (let i = 0; i < 5; i++) {
    const a = Math.PI - (i / 4) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(w * 0.74, horizon + h * 0.07 + 4);
    ctx.lineTo(w * 0.74 + Math.cos(a) * w * 0.07, horizon + h * 0.07 + 4 + Math.sin(a) * w * 0.07);
    ctx.lineTo(w * 0.74 + Math.cos(a) * w * 0.07 * 0.94, horizon + h * 0.07 + 4 + w * 0.006);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#20242c";
  ctx.fillRect(w * 0.74 - 2.5, horizon + h * 0.07 + 4, 5, h * 0.04);
}

function paintLobby(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) {
  const hor = h * 0.44;
  const vpX = w * 0.5;
  const top = h * 0.12;
  const bw = w * 0.6;
  const bx = (w - bw) / 2;

  vertGrad(ctx, bx, top, bw, hor - top, [
    [0, "#c8a468"],
    [1, mix("#c8a468", "#000000", 0.4)],
  ]);
  // Marmolado.
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    ctx.beginPath();
    ctx.moveTo(bx + (i % 13) * (bw / 13), top + 8 + rand() * (hor - top));
    ctx.lineTo(bx + (i % 13) * (bw / 13) + 6, top + 8 + rand() * (hor - top));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Panel de madera lateral.
  vertGrad(ctx, 0, 0, w * 0.12, hor, [
    [0, "#5a4330"],
    [1, mix("#5a4330", "#000000", 0.5)],
  ]);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * (hor / 18) + (h - hor) * 0);
    ctx.lineTo(w * 0.12, i * (hor / 18));
    ctx.stroke();
  }

  // Piso mármol.
  vertGrad(ctx, bx, hor, bw, h - hor, [
    [0, "#c6c1b6"],
    [0.25, "#a8a494"],
    [1, mix("#a8a494", "#000000", 0.55)],
  ]);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 12; i++) {
    ctx.beginPath();
    ctx.moveTo(vpX - w * 0.3, hor + (h - hor) * (i / 12));
    ctx.lineTo(vpX + w * 0.3, hor + (h - hor) * (i / 12));
    ctx.stroke();
  }

  // Recepción.
  const deskW = w * 0.2;
  const deskX = w * 0.5 - deskW / 2;
  vertGrad(ctx, deskX, hor - h * 0.11, deskW, h * 0.11, [
    [0, "#3a2f24"],
    [1, "#1c1712"],
  ]);
  vertGrad(ctx, deskX, hor - h * 0.115, deskW, h * 0.02, [
    [0, "#e8e0cf"],
    [1, "#c0b8a4"],
  ]);

  // Lámpara colgante central.
  ctx.strokeStyle = "#8f6a3c";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(vpX, top);
  ctx.lineTo(vpX, h * 0.22);
  ctx.stroke();
  const chandelier = ctx.createRadialGradient(vpX, h * 0.24, 4, vpX, h * 0.24, h * 0.07);
  chandelier.addColorStop(0, "#ffe9b0");
  chandelier.addColorStop(0.5, "#e0b060");
  chandelier.addColorStop(1, "#5a4328");
  ctx.fillStyle = chandelier;
  ctx.beginPath();
  ctx.arc(vpX, h * 0.24, h * 0.07, 0, Math.PI * 2);
  ctx.fill();
  glow(ctx, vpX, h * 0.26, h * 0.22, "rgba(255,225,160,0.7)", 0.5);

  // Sofás + mesita.
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(w * 0.22, hor + h * 0.11, w * 0.1, h * 0.02, 0, 0, Math.PI * 2);
  ctx.fill();
  vertGrad(ctx, w * 0.14, hor - h * 0.07, w * 0.16, h * 0.07, [
    [0, "#9a5a4a"],
    [1, mix("#9a5a4a", "#000000", 0.45)],
  ]);
  vertGrad(ctx, w * 0.14, hor - h * 0.1, w * 0.16, h * 0.03, [
    [0, "#b06a58"],
    [1, "#7a4436"],
  ]);
  ctx.fillStyle = "#e8d9a8";
  rrect(ctx, { x: w * 0.21, y: hor - h * 0.045, w: w * 0.09, h: h * 0.011 }, 3);
  ctx.fill();

  // Plantas altas.
  drawPlant(ctx, w * 0.07, hor, h * 0.11);
  drawPlant(ctx, w * 0.93, hor, h * 0.1);

  drawFloorLamp(ctx, w * 0.86, hor, h * 0.2);
  void rand;
}

function paintCowork(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) {
  const hor = h * 0.46;
  vertGrad(ctx, 0, 0, w, hor, [
    [0, "#23303a"],
    [1, mix("#23303a", "#000000", 0.35)],
  ]);
  vertGrad(ctx, 0, hor, w, h - hor, [
    [0, "#4a4038"],
    [1, mix("#4a4038", "#000000", 0.55)],
  ]);

  // Ventanales posteriores al sol.
  paintWindow(ctx, w, h, rand, "living");

  // Mesas largas.
  for (let row = 0; row < 3; row++) {
    const mx = w * 0.08;
    const mw = w * 0.4;
    const myTop = hor - h * 0.14 - row * h * 0.03;
    const decomp = ctx.createLinearGradient(mx, myTop, mx, hor);
    decomp.addColorStop(0, "#8a6a44");
    decomp.addColorStop(1, mix("#8a6a44", "#000000", 0.5));
    ctx.fillStyle = decomp;
    ctx.fillRect(mx, myTop, mw, h * 0.013);
    vertGrad(ctx, mx, myTop + h * 0.013, mw, h * 0.05, [
      [0, "#5a442e"],
      [1, "#241b12"],
    ]);
    // Sillas.
    for (let s = 0; s < 4; s++) {
      const sx = mx + mw * 0.08 + s * mw * 0.26;
      ctx.fillStyle = "#20242c";
      rrect(ctx, { x: sx - 9, y: myTop + h * 0.03, w: 18, h: h * 0.06 }, 4);
      ctx.fill();
      ctx.fillStyle = "#8a6a44";
      rrect(ctx, { x: sx - 7, y: myTop + h * 0.028, w: 14, h: 5 }, 2);
      ctx.fill();
    }
  }

  // Lámparas colgantes + luz cálida.
  for (const lx of [w * 0.26, w * 0.5, w * 0.74]) {
    ctx.strokeStyle = "#2a3138";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx, h * 0.09);
    ctx.stroke();
    ctx.fillStyle = "#c8a060";
    ctx.beginPath();
    ctx.arc(lx, h * 0.1, h * 0.025, 0, Math.PI * 2);
    ctx.fill();
    glow(ctx, lx, h * 0.12, h * 0.1, "rgba(255,220,150,0.7)", 0.5);
  }

  // Pizarra.
  ctx.fillStyle = "#1a222c";
  ctx.fillRect(w * 0.62, h * 0.24, w * 0.24, h * 0.14);
  ctx.strokeStyle = "#2c3540";
  ctx.lineWidth = 6;
  ctx.strokeRect(w * 0.62, h * 0.24, w * 0.24, h * 0.14);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.font = `bold ${h * 0.028}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("TORRE HORIZONTE", w * 0.74, h * 0.3);
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(
      w * 0.64 + (i % 4) * w * 0.05,
      h * 0.32 + Math.floor(i / 4) * h * 0.035,
      w * 0.03,
      h * 0.012,
    );
  }
  void rand;
}

function paintGym(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) {
  const hor = h * 0.5;
  vertGrad(ctx, 0, 0, w, hor, [
    [0, "#141924"],
    [1, "#252b38"],
  ]);
  vertGrad(ctx, 0, hor, w, h - hor, [
    [0, "#1a1f2a"],
    [1, "#0c0f16"],
  ]);

  // Franja de LED.
  ctx.fillStyle = "rgba(120,180,255,0.5)";
  ctx.fillRect(0, hor - h * 0.04, w, 4);
  glow(ctx, w * 0.5, hor - h * 0.04, w * 0.2, "rgba(120,180,255,0.4)", 0.4);

  // Espejo de pared.
  const mirGrad = ctx.createLinearGradient(0, h * 0.12, 0, hor - h * 0.04);
  mirGrad.addColorStop(0, "#9fb4cf");
  mirGrad.addColorStop(0.5, "#d6e0ec");
  mirGrad.addColorStop(1, "#b8c5d4");
  ctx.fillStyle = mirGrad;
  ctx.fillRect(0, h * 0.12, w, hor - h * 0.16);

  // Equipos (silluetas).
  for (const [ex, ew, eh] of [
    [w * 0.06, w * 0.14, h * 0.16],
    [w * 0.26, w * 0.12, h * 0.12],
    [w * 0.44, w * 0.15, h * 0.18],
  ] as const) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(ex + ew / 2, hor - eh * 0.1, ew * 0.5, h * 0.015, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = blend("#3a444f", "#151a22", rand());
    rrect(ctx, { x: ex, y: hor - eh, w: ew, h: eh }, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(ex + 4, hor - eh + 4, ew - 8, eh * 0.3);
    ctx.fillStyle = "#0d0f14";
    ctx.fillRect(ex + 6, hor - eh + eh * 0.36, ew * 0.55, eh * 0.5);
    ctx.beginPath();
    ctx.arc(ex + 6, hor - eh + eh * 0.36 + eh * 0.25, eh * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  // Mancuernas.
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = "#3a444f";
    const wx = w * 0.72 + (i % 4) * w * 0.03;
    const wy = hor + h * 0.1 + Math.floor(i / 4) * h * 0.05;
    ctx.fillRect(wx, wy, w * 0.018, h * 0.012);
    ctx.fillRect(wx - 2, wy - 1, w * 0.008, h * 0.014);
    ctx.fillRect(wx + w * 0.018, wy - 1, w * 0.008, h * 0.014);
  }
}

function paintSum(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) {
  const hor = h * 0.47;
  vertGrad(ctx, 0, 0, w, hor, [
    [0, "#222833"],
    [1, mix("#222833", "#000000", 0.3)],
  ]);
  vertGrad(ctx, 0, hor, w, h - hor, [
    [0, "#3a3f49"],
    [1, mix("#3a3f49", "#000000", 0.55)],
  ]);

  paintWindow(ctx, w, h, rand, "living");

  // Proyector.
  ctx.fillStyle = "#161b24";
  ctx.fillRect(w * 0.5 - w * 0.14, h * 0.2, w * 0.28, h * 0.16);
  ctx.fillStyle = "rgba(140,160,200,0.16)";
  ctx.fillRect(w * 0.5 - w * 0.13, h * 0.205, w * 0.26, h * 0.15);

  // Sofás enfrentados.
  for (const [sx, sw, dir] of [
    [w * 0.14, w * 0.22, 1],
    [w * 0.64, w * 0.22, -1],
  ] as const) {
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(sx + sw / 2, hor + h * 0.08, sw * 0.5, h * 0.02, 0, 0, Math.PI * 2);
    ctx.fill();
    vertGrad(ctx, sx, hor - h * 0.09, sw, h * 0.09, [
      [0, "#4a3a52"],
      [1, mix("#4a3a52", "#000000", 0.45)],
    ]);
    vertGrad(ctx, sx, hor - h * 0.12, sw, h * 0.03, [
      [0, "#5a4a66"],
      [1, "#382c44"],
    ]);
    // Pulman dirigido al centro.
    const back = sx + (dir === 1 ? 0 : sw - sw * 0.04);
    const backH = h * 0.13;
    ctx.fillStyle = "#3a2f44";
    ctx.beginPath();
    ctx.moveTo(back + (dir === 1 ? 0 : sw * 0.04), hor - h * 0.12);
    ctx.lineTo(back + dir * -sw * 0.04, hor - h * 0.12 - backH);
    ctx.lineTo(back + dir * -sw * 0.04 + sw * 0.04, hor - h * 0.12 - backH);
    ctx.lineTo(back + (dir === 1 ? sw * 0.04 : 0), hor - h * 0.12);
    ctx.closePath();
    ctx.fill();
  }

  // Mesa central.
  vertGrad(ctx, w * 0.5 - w * 0.03, hor - h * 0.025, w * 0.06, h * 0.025, [
    [0, "#e8dcb0"],
    [1, "#b0a478"],
  ]);

  // Plantas + lámparas.
  drawPlant(ctx, w * 0.05, hor, h * 0.1);
  drawPlant(ctx, w * 0.95, hor, h * 0.1);
  drawFloorLamp(ctx, w * 0.3, hor, h * 0.16);
  drawFloorLamp(ctx, w * 0.7, hor, h * 0.16);
}

function blend(a: string, b: string, t: number): string {
  return mix(a, b, t);
}

/* ----------------------------------------------------------------------- */
/* API pública                                                              */
/* ----------------------------------------------------------------------- */

export function unitThumb(kind: InteriorKind, seed: number | string): string {
  const w = 640;
  const h = 400;
  return interiorStill(kind, seed, { w, h });
}

export function unitHero(seed: number | string): string {
  return interiorStill("living", seed, { w: 1280, h: 720 });
}

const isInBrowser = typeof document !== "undefined";

export function prewarmRenders() {
  if (!isInBrowser) return;
  exteriorStill("golden");
  galleryStill("rooftop");
  galleryStill("lobby");
  galleryStill("cowork");
  interiorStill("living", 1);
}
