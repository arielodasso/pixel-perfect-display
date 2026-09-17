import type { VirtualTourScene, VirtualTourSceneKind } from "./types";

/**
 * Generador procedural de panoramas 360° (texturas equirectangulares).
 *
 * El tour virtual genera sus interiores automáticamente — como la plataforma
 * de referencia — sin depender de fotos: cada ambiente (living, cocina,
 * dormitorio, baño, balcón) se dibuja en un canvas 2D en proyección
 * equirectangular y se mapea a una esfera en el viewer (Three.js/WebGL).
 *
 * La textura es determinística por `seed`: misma unidad → mismo recorrido,
 * con variaciones de paleta entre ambientes de distintas unidades.
 */

export const W = 2048;
export const H = 1024;

export const SCENE_META: Record<VirtualTourSceneKind, { label: string; blurb: string }> = {
  living: { label: "Living", blurb: "Living y comedor integrados" },
  kitchen: { label: "Cocina", blurb: "Cocina integrada equipada" },
  bedroom: { label: "Dormitorio", blurb: "Dormitorio principal" },
  bath: { label: "Baño", blurb: "Baño completo" },
  balcony: { label: "Balcón", blurb: "Balcón con vista" },
};

/** Seudo-random determinístico (mulberry32). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashCode(text: string): number {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = (hash * 33) ^ text.charCodeAt(i);
  return hash >>> 0;
}

/** Convierte pitch (grados, -90..90) a píxel Y equirectangular. */
function pitchToY(pitch: number): number {
  return ((Math.max(-90, Math.min(90, pitch)) + 90) / 180) * H;
}

/** Convierte yaw (grados) a píxel X equirectangular (wrap 0..360). */
function yawToX(yaw: number): number {
  const normalized = ((yaw % 360) + 360) % 360;
  return (normalized / 360) * W;
}

interface Palette {
  wall: string;
  accent: string;
  ceiling: string;
  floor: string;
  floorLine: string;
  trim: string;
  warm: string;
}

const PALETTES: Record<VirtualTourSceneKind, Palette> = {
  living: {
    wall: "#3b4152",
    accent: "#b0524a",
    ceiling: "#252a36",
    floor: "#6b4a32",
    floorLine: "#4d3626",
    trim: "#8f97a8",
    warm: "#e8c66e",
  },
  kitchen: {
    wall: "#39444a",
    accent: "#2c3b40",
    ceiling: "#222b31",
    floor: "#535a52",
    floorLine: "#3b413c",
    trim: "#93a5a2",
    warm: "#d9b96a",
  },
  bedroom: {
    wall: "#35414f",
    accent: "#2d4a4f",
    ceiling: "#212a35",
    floor: "#6b4a32",
    floorLine: "#4d3626",
    trim: "#92a5b5",
    warm: "#cfae6a",
  },
  bath: {
    wall: "#3a4150",
    accent: "#55647a",
    ceiling: "#242b39",
    floor: "#4f5666",
    floorLine: "#3a3f4d",
    trim: "#9aa4b5",
    warm: "#e0c07a",
  },
  balcony: {
    wall: "#303844",
    accent: "#2a313c",
    ceiling: "#1c222c",
    floor: "#5a5348",
    floorLine: "#443f37",
    trim: "#7f8a99",
    warm: "#f0d27e",
  },
};

/** Dibuja la vista de ciudad desde la ventana (cielo + skyline + luces). */
function drawCityView(
  ctx: CanvasRenderingContext2D,
  cx: number,
  halfWidth: number,
  top: number,
  bottom: number,
  rand: () => number,
) {
  const sky = ctx.createLinearGradient(0, top, 0, bottom);
  sky.addColorStop(0, "#10182e");
  sky.addColorStop(0.55, "#2a3860");
  sky.addColorStop(1, "#5a4a63");
  ctx.fillStyle = sky;
  ctx.fillRect(cx - halfWidth, top, halfWidth * 2, bottom - top);

  // Luces cálidas de la ciudad lejana.
  const horizonY = top + (bottom - top) * 0.62;
  const skyGlow = ctx.createLinearGradient(0, horizonY, 0, bottom);
  skyGlow.addColorStop(0, "rgba(240, 210, 126, 0)");
  skyGlow.addColorStop(1, "rgba(240, 210, 126, 0.32)");
  ctx.fillStyle = skyGlow;
  ctx.fillRect(cx - halfWidth, horizonY, halfWidth * 2, bottom - horizonY);

  // Silueta de torres.
  ctx.fillStyle = "#0d1220";
  const buildings = 14;
  const unit = (halfWidth * 2) / buildings;
  for (let i = 0; i < buildings; i++) {
    const bw = unit * (0.55 + rand() * 0.45);
    const bh = (bottom - horizonY) * (0.35 + rand() * 0.65) + 6;
    const bx = cx - halfWidth + i * unit;
    ctx.fillRect(bx, horizonY - bh + 4, bw, bh);
    // Ventanas.
    ctx.fillStyle = rand() > 0.55 ? "rgba(240, 210, 126, 0.75)" : "rgba(240, 210, 126, 0.18)";
    const rows = Math.floor(bh / 7);
    for (let r = 0; r < rows; r++) {
      const cols = Math.max(1, Math.floor(bw / 6));
      for (let c2 = 0; c2 < cols; c2++) {
        if (rand() > 0.35) {
          ctx.fillRect(bx + c2 * 6 + 1.5, horizonY - bh + 4 + r * 7 + 2, 2.6, 3.2);
        }
      }
    }
    ctx.fillStyle = "#0d1220";
  }

  // Tela de horizonte (línea).
  ctx.fillStyle = "rgba(8, 10, 20, 0.9)";
  ctx.fillRect(cx - halfWidth, horizonY + 2, halfWidth * 2, 3);
}

function drawWindow(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  centerYaw: number,
  halfWidthDeg: number,
  rand: () => number,
) {
  const cx = yawToX(centerYaw);
  const hw = (halfWidthDeg / 360) * W;
  const top = pitchToY(40);
  const bottom = pitchToY(-12);
  if (bottom <= top) return;
  drawCityView(ctx, cx, hw, top, bottom, rand);

  // Marco y travesaños.
  ctx.strokeStyle = "#0b0f18";
  ctx.lineWidth = 10;
  ctx.strokeRect(cx - hw, top, hw * 2, bottom - top);
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx - hw, top + (bottom - top) * 0.42);
  ctx.lineTo(cx + hw, top + (bottom - top) * 0.42);
  ctx.moveTo(cx, top);
  ctx.lineTo(cx, bottom);
  ctx.stroke();

  // Anteojo de aluminio.
  ctx.strokeStyle = "#3b4457";
  ctx.lineWidth = 3;
  ctx.strokeRect(cx - hw + 4.5, top + 4.5, hw * 2 - 9, bottom - top - 9);

  // Reflejo diagonal sutil.
  const sheen = ctx.createLinearGradient(cx - hw, top, cx + hw, bottom);
  sheen.addColorStop(0, "rgba(255,255,255,0.10)");
  sheen.addColorStop(0.4, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(cx - hw, top, hw * 2, bottom - top);
  void palette;
}

function drawArtwork(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  centerYaw: number,
  halfWidthDeg: number,
  rand: () => number,
) {
  const cx = yawToX(centerYaw);
  const hw = (halfWidthDeg / 360) * W;
  const top = pitchToY(32);
  const h = Math.min(H * 0.22, Math.max(40, H * 0.2));
  // Marco.
  ctx.fillStyle = palette.trim;
  ctx.fillRect(cx - hw, top, hw * 2, h);
  ctx.fillStyle = "#10131c";
  ctx.fillRect(cx - hw + 6, top + 6, hw * 2 - 12, h - 12);
  // Arte abstracto.
  const art = ctx.createLinearGradient(cx - hw, top + 6, cx + hw, top + h - 6);
  art.addColorStop(0, palette.accent);
  art.addColorStop(0.5, rand() > 0.5 ? palette.warm : palette.accent);
  art.addColorStop(1, palette.trim);
  ctx.fillStyle = art;
  ctx.fillRect(cx - hw + 6, top + 6, hw * 2 - 12, h - 12);
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = "#0d0f16";
  ctx.lineWidth = 10;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - hw + 20, top + 14 + i * 22 + rand() * 14);
    ctx.bezierCurveTo(
      cx - hw + 60,
      top + 30 + i * 16,
      cx - hw + 110,
      top + 6 + i * 30,
      cx + hw - 20,
      top + 18 + i * 22,
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawDoor(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  centerYaw: number,
  halfWidthDeg: number,
) {
  const cx = yawToX(centerYaw);
  const hw = (halfWidthDeg / 360) * W;
  const top = pitchToY(52);
  const bottom = pitchToY(-30);
  // Abertura.
  ctx.fillStyle = "#171a24";
  ctx.fillRect(cx - hw, top, hw * 2, bottom - top);
  // Puerta.
  ctx.fillStyle = "#1f2430";
  ctx.fillRect(cx - hw + 6, top + 6, hw * 2 - 12, bottom - top - 6);
  const panelGradient = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0);
  panelGradient.addColorStop(0, "rgba(255,255,255,0.05)");
  panelGradient.addColorStop(0.5, "rgba(255,255,255,0)");
  panelGradient.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = panelGradient;
  ctx.fillRect(cx - hw + 6, top + 6, hw * 2 - 12, bottom - top - 6);
  // Marcos de panel.
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 3;
  ctx.strokeRect(cx - hw + 18, top + 24, hw * 2 - 36, (bottom - top) * 0.42);
  ctx.strokeRect(cx - hw + 18, top + (bottom - top) * 0.5, hw * 2 - 36, (bottom - top) * 0.44);
  // Tirador.
  ctx.fillStyle = palette.warm;
  ctx.beginPath();
  ctx.arc(cx + hw - 22, (top + bottom) / 2, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawFurniture(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  centerYaw: number,
  halfWidthDeg: number,
  baseColor: string,
  heightRatio: number,
  rand: () => number,
) {
  const cx = yawToX(centerYaw);
  const hw = (halfWidthDeg / 360) * W;
  const horizon = pitchToY(-2);
  const height = horizon * heightRatio + H * 0.06;
  const floorY = pitchToY(-24);

  // Sombra en el piso.
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(cx, floorY + 8, hw * 0.92, 14, 0, Math.PI, 0);
  ctx.fill();

  // Cuerpo del mueble.
  const body = ctx.createLinearGradient(0, horizon - height, 0, floorY);
  body.addColorStop(0, baseColor);
  body.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = body;
  ctx.fillRect(cx - hw, horizon - height, hw * 2, height + (floorY - horizon));

  // Canto superior.
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(cx - hw, horizon - height, hw * 2, 6);

  // Detalle frontal (cojines / puertas).
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  const rows = Math.max(1, Math.floor(height / 42));
  for (let i = 0; i < rows; i++) {
    ctx.fillRect(cx - hw + 10, horizon - height + 10 + i * 42, hw * 2 - 20, 16);
  }
  void palette;
  void rand;
}

function drawCeiling(ctx: CanvasRenderingContext2D, palette: Palette, ceilingY: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, ceilingY + H * 0.1);
  gradient.addColorStop(0, palette.ceiling);
  gradient.addColorStop(1, palette.wall);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, ceilingY);

  // Plafón central cálido.
  const cx = W / 2;
  const cy = pitchToY(88);
  const glow = ctx.createRadialGradient(cx, cy, 6, cx, cy, H * 0.18);
  glow.addColorStop(0, "rgba(250, 226, 160, 0.85)");
  glow.addColorStop(0.16, "rgba(250, 226, 160, 0.16)");
  glow.addColorStop(1, "rgba(250, 226, 160, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, ceilingY + H * 0.1);

  ctx.fillStyle = "#e8d9a8";
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawFloor(ctx: CanvasRenderingContext2D, palette: Palette, horizonY: number) {
  const gradient = ctx.createLinearGradient(0, horizonY, 0, H);
  gradient.addColorStop(0, "rgba(0,0,0,0.45)");
  gradient.addColorStop(1, "rgba(0,0,0,0.1)");
  ctx.fillStyle = palette.floor;
  ctx.fillRect(0, horizonY, W, H - horizonY);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, horizonY, W, H - horizonY);

  // Tablones radiantes desde el centro (perspectiva).
  ctx.strokeStyle = palette.floorLine;
  ctx.lineWidth = 3;
  const cx = W / 2;
  for (let i = 1; i < 16; i++) {
    const t = i / 16;
    const y = horizonY + (H - horizonY) * t * t;
    ctx.globalAlpha = 0.5 * t;
    ctx.beginPath();
    ctx.moveTo(cx - W * t * 2.2, y);
    ctx.lineTo(cx + W * t * 2.2, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Junta central (línea de horizonte del piso).
  ctx.fillStyle = palette.floorLine;
  ctx.fillRect(0, horizonY, W, 4);
}

function drawRug(ctx: CanvasRenderingContext2D, centerYaw: number, rand: () => number) {
  const cx = yawToX(centerYaw);
  const horizon = pitchToY(-2);
  const rx = W * 0.18;
  const ry = H * 0.1;
  const cy = horizon + H * 0.13;
  ctx.fillStyle = "rgba(140, 120, 95, 0.5)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(220, 190, 130, 0.55)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(220, 190, 130, 0.35)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.4, ry * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 40; i++) {
    if (rand() > 0.5) continue;
    const a = rand() * Math.PI * 2;
    const r = rand() * rx * 0.9;
    ctx.fillStyle = "rgba(90, 70, 50, 0.5)";
    ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7, 3, 3);
  }
}

function drawVignette(ctx: CanvasRenderingContext2D) {
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.95);
  vignette.addColorStop(0, "rgba(5, 7, 14, 0)");
  vignette.addColorStop(1, "rgba(5, 7, 14, 0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

function drawGrain(ctx: CanvasRenderingContext2D, rand: () => number) {
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = rand() > 0.5 ? "#ffffff" : "#000000";
    ctx.fillRect(Math.floor(rand() * W), Math.floor(rand() * H), 1.4, 1.4);
  }
  ctx.globalAlpha = 1;
}

/** Luz cálida que entra desde la ventana al piso. */
function drawLightPool(ctx: CanvasRenderingContext2D, windowYaw: number, horizonY: number) {
  const cx = yawToX(windowYaw);
  const spread = W * 0.16;
  const pool = ctx.createRadialGradient(
    cx,
    horizonY + H * 0.02,
    6,
    cx,
    horizonY + H * 0.04,
    spread,
  );
  pool.addColorStop(0, "rgba(240, 210, 126, 0.30)");
  pool.addColorStop(1, "rgba(240, 210, 126, 0)");
  ctx.fillStyle = pool;
  ctx.fillRect(cx - spread, horizonY, spread * 2, H - horizonY);
}

function drawBaseboard(ctx: CanvasRenderingContext2D, palette: Palette, horizonY: number) {
  ctx.fillStyle = palette.trim;
  ctx.fillRect(0, horizonY, W, 7);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(0, horizonY + 7, W, 3);
}

export function renderPanorama(scene: Pick<VirtualTourScene, "id" | "kind" | "seed">): string {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const rand = mulberry32(hashCode(scene.id) ^ (scene.seed * 2654435761));
  const palette = PALETTES[scene.kind];
  const horizonY = pitchToY(0);
  const ceilingY = pitchToY(34);

  // Paredes.
  ctx.fillStyle = palette.wall;
  ctx.fillRect(0, 0, W, H);

  drawCeiling(ctx, palette, ceilingY);
  drawFloor(ctx, palette, horizonY);
  drawBaseboard(ctx, palette, horizonY);

  // Acento cálido sobre la pared (tintado superior).
  const wallSheen = ctx.createLinearGradient(0, 0, 0, horizonY);
  wallSheen.addColorStop(0, "rgba(255, 220, 150, 0.10)");
  wallSheen.addColorStop(1, "rgba(255, 220, 150, 0)");
  ctx.fillStyle = wallSheen;
  ctx.fillRect(0, ceilingY, W, horizonY - ceilingY);

  const windowYaw = 0;
  const features =
    scene.kind === "living"
      ? 3
      : scene.kind === "kitchen"
        ? 3
        : scene.kind === "bedroom"
          ? 3
          : scene.kind === "bath"
            ? 2
            : 1;

  // Entorno según ambiente.
  if (scene.kind === "living") {
    drawWindow(ctx, palette, 0, 26, rand);
    drawLightPool(ctx, 0, horizonY);
    drawArtwork(ctx, palette, 180, 14, rand);
    drawDoor(ctx, palette, 262, 9);
    drawRug(ctx, 0, rand);
    drawFurniture(ctx, palette, 0, 26, "#4a3a52", 0.62, rand); // sofá
    drawFurniture(ctx, palette, 180, 18, "#262b38", 0.5, rand); // consola/TV
    if (features >= 3) {
      drawWindow(ctx, palette, 95, 16, rand);
    }
  } else if (scene.kind === "kitchen") {
    drawWindow(ctx, palette, 0, 20, rand);
    drawLightPool(ctx, 0, horizonY);
    drawFurniture(ctx, palette, 0, 30, "#383c33", 0.78, rand); // mesada
    drawFurniture(ctx, palette, 180, 34, "#22262e", 0.9, rand); // alacena
    drawFurniture(ctx, palette, 265, 16, "#41564b", 0.7, rand); // heladera
    drawArtwork(ctx, palette, 90, 8, rand);
  } else if (scene.kind === "bedroom") {
    drawWindow(ctx, palette, 0, 22, rand);
    drawLightPool(ctx, 0, horizonY);
    drawArtwork(ctx, palette, 180, 12, rand);
    drawDoor(ctx, palette, 262, 9);
    drawFurniture(ctx, palette, 88, 24, "#3c4858", 0.66, rand); // cama
    drawFurniture(ctx, palette, 175, 10, "#2d3240", 0.78, rand); // mesita/locker
    drawRug(ctx, 180, rand);
  } else if (scene.kind === "bath") {
    drawWindow(ctx, palette, 90, 13, rand);
    drawFurniture(ctx, palette, 270, 24, "#3a6b7a", 0.8, rand); // espejo/vanitory
    drawArtwork(ctx, palette, 180, 10, rand);
    if (features >= 2) {
      drawFurniture(ctx, palette, 0, 12, "#4a5568", 0.6, rand); // duckche
    }
  } else {
    // Balcón: muro bajo + baranda, cielo abierto.
    const railingTop = pitchToY(6);
    const railingBase = pitchToY(-30);
    drawCityView(ctx, W / 2, W * 0.42, 0, railingBase, rand);
    ctx.fillStyle = "#0d1118";
    ctx.fillRect(0, 0, W, railingTop);
    for (let x = 0; x < W; x += 34) {
      ctx.fillStyle = "#232a38";
      ctx.fillRect(x, railingTop, 4, railingBase - railingTop);
    }
    ctx.fillStyle = "#c8cdd6";
    ctx.fillRect(0, railingTop, W, 4);
    ctx.fillStyle = "#7d8590";
    ctx.fillRect(0, railingBase, W, 4);
    drawFurniture(ctx, palette, 180, 12, "#3a3f49", 0.5, rand); // banco
  }

  drawVignette(ctx);
  drawGrain(ctx, rand);

  return canvas.toDataURL("image/jpeg", 0.86);
}
