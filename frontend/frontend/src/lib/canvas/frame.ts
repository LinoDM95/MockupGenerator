import type { FrameStyle } from "../../types/mockup";

import {
  FRAME_SHADOW_BOTTOM,
  FRAME_SHADOW_LEFT,
  FRAME_SHADOW_RIGHT,
  FRAME_SHADOW_TOP,
} from "../frameShadowSides";

/** Entspricht der Ausdehnung in `drawRealisticFrame` (Außenkante um Motiv-Rechteck). */
export const getFrameThickness = (w: number, h: number): number => Math.max(w, h) * 0.025;

/** Deterministisches Rauschen 0–1 (export-stabil, kein Math.random pro Pixel). */
const hash01 = (ix: number, iy: number, salt: number): number => {
  const s = Math.sin(ix * 12.9898 + iy * 78.233 + salt * 31.415) * 43758.5453;
  return s - Math.floor(s);
};

let noisePatternCache: CanvasPattern | null = null;

const getFineGrainPattern = (ctx: CanvasRenderingContext2D): CanvasPattern | null => {
  if (noisePatternCache) return noisePatternCache;
  if (typeof document === "undefined") return null;
  const size = 64;
  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext("2d", { willReadFrequently: true });
  if (!tctx) return null;
  const img = tctx.createImageData(size, size);
  const d = img.data;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = (py * size + px) * 4;
      const n = hash01(px, py, 2.718);
      const v = 118 + n * 92;
      const g = v - 6 + n * 14;
      const b = v - 2;
      d[i] = v;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  tctx.putImageData(img, 0, 0);
  const pat = ctx.createPattern(tile, "repeat");
  noisePatternCache = pat;
  return pat;
};

type FaceGrad = { hi: string; mid: string; lo: string };

type FramePalette = {
  top: FaceGrad;
  right: FaceGrad;
  bottom: FaceGrad;
  left: FaceGrad;
  /** feine Innenkante Motiv ↔ Rahmen */
  innerLine: string;
  innerLineSoft: string;
  /** Körnung: Modus + Deckkraft */
  grain: { mode: GlobalCompositeOperation; alpha: number };
  /** Holz-Maserung (nur style wood) */
  woodGrain?: { alpha: number; stroke: string; stepScale: number };
  /** Außenkante Glanz */
  rim: string;
};

const PALETTES: Record<Exclude<FrameStyle, "none">, FramePalette> = {
  black: {
    top: { hi: "#4a4744", mid: "#2f2c2a", lo: "#161413" },
    right: { hi: "#353230", mid: "#221f1d", lo: "#0c0b0a" },
    bottom: { hi: "#2a2725", mid: "#181615", lo: "#070605" },
    left: { hi: "#403c3a", mid: "#2a2624", lo: "#12100f" },
    innerLine: "rgba(0,0,0,0.45)",
    innerLineSoft: "rgba(255,255,255,0.06)",
    grain: { mode: "overlay", alpha: 0.11 },
    rim: "rgba(255,255,255,0.14)",
  },
  white: {
    top: { hi: "#fdfcfa", mid: "#f3f0e8", lo: "#e4dfd4" },
    right: { hi: "#f7f4ec", mid: "#ebe6dc", lo: "#d8d2c6" },
    bottom: { hi: "#ede8de", mid: "#ddd7cb", lo: "#cbc4b6" },
    left: { hi: "#faf7f0", mid: "#f0ebe2", lo: "#ded8cc" },
    innerLine: "rgba(0,0,0,0.12)",
    innerLineSoft: "rgba(255,255,255,0.35)",
    grain: { mode: "multiply", alpha: 0.07 },
    rim: "rgba(255,255,255,0.55)",
  },
  wood: {
    top: { hi: "#d4a574", mid: "#9d6b3d", lo: "#4a2f18" },
    right: { hi: "#a67d52", mid: "#6b4526", lo: "#2d1a0c" },
    bottom: { hi: "#7a5230", mid: "#4d3118", lo: "#241308" },
    left: { hi: "#c49363", mid: "#8b5a32", lo: "#3d2412" },
    innerLine: "rgba(20,10,4,0.55)",
    innerLineSoft: "rgba(255,220,180,0.08)",
    grain: { mode: "multiply", alpha: 0.1 },
    woodGrain: { alpha: 0.22, stroke: "rgba(35, 20, 8, 0.45)", stepScale: 0.35 },
    rim: "rgba(255,235,200,0.18)",
  },
};

const clipFrameRing = (
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  ow: number,
  oh: number,
  ix: number,
  iy: number,
  iw: number,
  ih: number,
): void => {
  ctx.beginPath();
  ctx.rect(ox, oy, ow, oh);
  ctx.rect(ix, iy, iw, ih);
  ctx.clip("evenodd");
};

let cornerPatchCanvas: HTMLCanvasElement | null = null;

/**
 * Eckfläche: Deckkraft = max beider Kanten-Verläufe (wie zwei orthogonale Linear-Gradienten,
 * aber ohne additive Überlagerung). Entspricht derselben Dichte wie an den geraden Kanten.
 */
const blitMaxCornerBlack = (
  ctx: CanvasRenderingContext2D,
  destX: number,
  destY: number,
  sPx: number,
  sample: (u: number, v: number) => number,
): void => {
  if (typeof document === "undefined") return;
  const sw = Math.max(1, sPx);
  const sh = Math.max(1, sPx);
  if (!cornerPatchCanvas || cornerPatchCanvas.width < sw || cornerPatchCanvas.height < sh) {
    cornerPatchCanvas = document.createElement("canvas");
    cornerPatchCanvas.width = sw;
    cornerPatchCanvas.height = sh;
  }
  const patch = cornerPatchCanvas;
  const pctx = patch.getContext("2d", { willReadFrequently: true });
  if (!pctx) return;
  pctx.imageSmoothingEnabled = false;
  const img = pctx.createImageData(sw, sh);
  const d = img.data;
  const invS = 1 / sPx;
  for (let j = 0; j < sh; j++) {
    for (let i = 0; i < sw; i++) {
      const u = (i + 0.5) * invS;
      const v = (j + 0.5) * invS;
      const t = Math.min(1, Math.max(0, sample(u, v)));
      const o = (j * sw + i) * 4;
      d[o] = 0;
      d[o + 1] = 0;
      d[o + 2] = 0;
      d[o + 3] = Math.round(255 * t);
    }
  }
  pctx.putImageData(img, 0, 0);
  const dx = Math.round(destX);
  const dy = Math.round(destY);
  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(patch, 0, 0, sw, sh, dx, dy, sw, sh);
  ctx.imageSmoothingEnabled = prevSmooth;
};

const drawTrapezoidGradient = (
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  gx0: number,
  gy0: number,
  gx1: number,
  gy1: number,
  face: FaceGrad,
): void => {
  const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
  g.addColorStop(0, face.hi);
  /** Späteres Mid: breitere helle Außenzone, Abdunklung konzentriert zur inneren Kante (mulden-/Einfalloptik). */
  g.addColorStop(0.58, face.mid);
  g.addColorStop(1, face.lo);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.lineTo(dx, dy);
  ctx.closePath();
  ctx.fill();
};

const drawWoodGrainOverlay = (
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  ow: number,
  oh: number,
  ix: number,
  iy: number,
  iw: number,
  ih: number,
  thickness: number,
  stroke: string,
  alpha: number,
  stepScale: number,
): void => {
  ctx.save();
  clipFrameRing(ctx, ox, oy, ow, oh, ix, iy, iw, ih);
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(0.35, thickness * 0.04);
  const step = Math.max(2.2, thickness * stepScale);
  const seed = ox * 0.01 + oy * 0.013;
  for (let u = ox - thickness; u < ox + ow + thickness; u += step) {
    const wob = Math.sin(u * 0.11 + seed) * thickness * 0.12 + Math.sin(u * 0.037) * thickness * 0.06;
    ctx.beginPath();
    ctx.moveTo(u + wob, oy - thickness * 0.2);
    ctx.quadraticCurveTo(
      u + wob * 1.4 + thickness * 0.08,
      oy + oh * 0.5,
      u + wob * 0.85,
      oy + oh + thickness * 0.2,
    );
    ctx.stroke();
  }
  ctx.restore();
};

const drawOuterRimHighlight = (
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  ow: number,
  oh: number,
  rim: string,
): void => {
  ctx.save();
  ctx.strokeStyle = rim;
  ctx.lineWidth = Math.max(0.75, Math.min(ow, oh) * 0.0018);
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.moveTo(ox + 0.5, oy + oh - 0.5);
  ctx.lineTo(ox + 0.5, oy + 0.5);
  ctx.lineTo(ox + ow - 0.5, oy + 0.5);
  ctx.stroke();
  ctx.restore();
};

const drawTextureOverlay = (
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  ow: number,
  oh: number,
  ix: number,
  iy: number,
  iw: number,
  ih: number,
  palette: FramePalette,
): void => {
  const pat = getFineGrainPattern(ctx);
  if (!pat) return;
  ctx.save();
  clipFrameRing(ctx, ox, oy, ow, oh, ix, iy, iw, ih);
  ctx.globalCompositeOperation = palette.grain.mode;
  ctx.globalAlpha = palette.grain.alpha;
  ctx.fillStyle = pat;
  ctx.fillRect(ox, oy, ow, oh);
  ctx.restore();
};

/**
 * Dunkler Verlauf am Motivrinneren, nur auf gewählten Seiten (Bitmaske).
 * Nach dem Motiv, vor `drawRealisticFrame`.
 */
export const drawInnerFrameShadowOnMotif = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  depth: number,
  thickness: number,
  sidesMask: number,
): void => {
  if (!sidesMask) return;
  const d = Math.min(1, Math.max(0.15, depth));
  const spreadF = Math.max(4, thickness * (0.62 + 0.58 * d));
  /** Ganzzahl: gleiche Breite wie Kanten-Gradienten → keine Subpixel-Naht zur Eck-Bitmap. */
  const s = Math.max(4, Math.round(spreadF));
  const alpha = 0.2 + 0.48 * d;

  const hasTop = (sidesMask & FRAME_SHADOW_TOP) !== 0;
  const hasBottom = (sidesMask & FRAME_SHADOW_BOTTOM) !== 0;
  const hasLeft = (sidesMask & FRAME_SHADOW_LEFT) !== 0;
  const hasRight = (sidesMask & FRAME_SHADOW_RIGHT) !== 0;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const fillBand = (
    gx0: number,
    gy0: number,
    gx1: number,
    gy1: number,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
  ) => {
    if (rw <= 0 || rh <= 0) return;
    const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
    g.addColorStop(0, `rgba(0,0,0,${alpha})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    const px = Math.round(rx);
    const py = Math.round(ry);
    const pw = Math.max(1, Math.round(rw));
    const ph = Math.max(1, Math.round(rh));
    ctx.fillRect(px, py, pw, ph);
  };

  /** Kanten ohne Eck-Quadrate → keine doppelte Deckkraft in den Ecken. */
  if (hasTop) {
    let rx = x;
    let rw = w;
    if (hasLeft) {
      rx += s;
      rw -= s;
    }
    if (hasRight) rw -= s;
    fillBand(x, y, x, y + s, rx, y, rw, s);
  }
  if (hasBottom) {
    let rx = x;
    let rw = w;
    if (hasLeft) {
      rx += s;
      rw -= s;
    }
    if (hasRight) rw -= s;
    fillBand(x, y + h, x, y + h - s, rx, y + h - s, rw, s);
  }
  if (hasLeft) {
    let ry = y;
    let rh = h;
    if (hasTop) {
      ry += s;
      rh -= s;
    }
    if (hasBottom) rh -= s;
    fillBand(x, y, x + s, y, x, ry, s, rh);
  }
  if (hasRight) {
    let ry = y;
    let rh = h;
    if (hasTop) {
      ry += s;
      rh -= s;
    }
    if (hasBottom) rh -= s;
    fillBand(x + w, y, x + w - s, y, x + w - s, ry, s, rh);
  }

  if (hasTop && hasLeft) {
    blitMaxCornerBlack(ctx, x, y, s, (u, v) => Math.max(alpha * (1 - v), alpha * (1 - u)));
  }
  if (hasTop && hasRight) {
    blitMaxCornerBlack(ctx, x + w - s, y, s, (u, v) => Math.max(alpha * (1 - v), alpha * u));
  }
  if (hasBottom && hasLeft) {
    blitMaxCornerBlack(ctx, x, y + h - s, s, (u, v) => Math.max(alpha * (1 - u), alpha * v));
  }
  if (hasBottom && hasRight) {
    blitMaxCornerBlack(ctx, x + w - s, y + h - s, s, (u, v) => Math.max(alpha * u, alpha * v));
  }

  ctx.restore();
};

/**
 * Schatten nach außen entlang der äußeren Rahmen-Box (nach dem Rahmen zeichnen).
 */
export const drawOuterFrameShadowBySides = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  thickness: number,
  sidesMask: number,
  depth: number,
): void => {
  if (!sidesMask) return;
  const d = Math.min(1, Math.max(0.15, depth));
  const outX = x - thickness;
  const outY = y - thickness;
  const outW = w + thickness * 2;
  const outH = h + thickness * 2;
  const spreadF = Math.max(8, thickness * (1.05 + 0.95 * d));
  const s = Math.max(8, Math.round(spreadF));
  const alpha = 0.1 + 0.38 * d;
  const pad = Math.max(2, Math.round(spreadF * 0.3));

  const hasTop = (sidesMask & FRAME_SHADOW_TOP) !== 0;
  const hasBottom = (sidesMask & FRAME_SHADOW_BOTTOM) !== 0;
  const hasLeft = (sidesMask & FRAME_SHADOW_LEFT) !== 0;
  const hasRight = (sidesMask & FRAME_SHADOW_RIGHT) !== 0;

  ctx.save();

  const fillOuterBand = (
    gx0: number,
    gy0: number,
    gx1: number,
    gy1: number,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
  ) => {
    if (rw <= 0 || rh <= 0) return;
    const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${alpha})`);
    ctx.fillStyle = g;
    ctx.fillRect(Math.round(rx), Math.round(ry), Math.max(1, Math.round(rw)), Math.max(1, Math.round(rh)));
  };

  const fillOuterBandRev = (
    gx0: number,
    gy0: number,
    gx1: number,
    gy1: number,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
  ) => {
    if (rw <= 0 || rh <= 0) return;
    const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
    g.addColorStop(0, `rgba(0,0,0,${alpha})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(Math.round(rx), Math.round(ry), Math.max(1, Math.round(rw)), Math.max(1, Math.round(rh)));
  };

  const fullTopW = outW + pad * 2;
  const fullSideH = outH + pad * 2;

  if (hasTop) {
    let rx = outX - pad;
    let rw = fullTopW;
    if (hasLeft) {
      rx += s;
      rw -= s;
    }
    if (hasRight) rw -= s;
    fillOuterBand(outX, outY - s, outX, outY, rx, outY - s, rw, s);
  }
  if (hasBottom) {
    let rx = outX - pad;
    let rw = fullTopW;
    if (hasLeft) {
      rx += s;
      rw -= s;
    }
    if (hasRight) rw -= s;
    fillOuterBandRev(outX, outY + outH, outX, outY + outH + s, rx, outY + outH, rw, s);
  }
  if (hasLeft) {
    let ry = outY - pad;
    let rh = fullSideH;
    if (hasTop) {
      ry += s;
      rh -= s;
    }
    if (hasBottom) rh -= s;
    fillOuterBand(outX - s, outY, outX, outY, outX - s, ry, s, rh);
  }
  if (hasRight) {
    let ry = outY - pad;
    let rh = fullSideH;
    if (hasTop) {
      ry += s;
      rh -= s;
    }
    if (hasBottom) rh -= s;
    fillOuterBand(outX + outW + s, outY, outX + outW, outY, outX + outW, ry, s, rh);
  }

  if (hasTop && hasLeft) {
    blitMaxCornerBlack(ctx, outX - s, outY - s, s, (u, v) => Math.max(alpha * u, alpha * v));
  }
  if (hasTop && hasRight) {
    blitMaxCornerBlack(ctx, outX + outW, outY - s, s, (u, v) => Math.max(alpha * v, alpha * (1 - u)));
  }
  if (hasBottom && hasLeft) {
    blitMaxCornerBlack(ctx, outX - s, outY + outH, s, (u, v) => Math.max(alpha * u, alpha * (1 - v)));
  }
  if (hasBottom && hasRight) {
    blitMaxCornerBlack(ctx, outX + outW, outY + outH, s, (u, v) => Math.max(alpha * (1 - u), alpha * (1 - v)));
  }

  ctx.restore();
};

export const drawRealisticFrame = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  style: FrameStyle,
): void => {
  if (style === "none") return;
  const thickness = getFrameThickness(w, h);
  const palette = PALETTES[style];

  const outX = x - thickness;
  const outY = y - thickness;
  const outW = w + thickness * 2;
  const outH = h + thickness * 2;

  const tcx = x + w * 0.5;
  const tcy = y + h * 0.5;

  /** Licht von oben-links: Außenkante hell, zur Bildöffnung hin dunkler (über die Rahmenbreite, nicht bis zur Mitte). */
  drawTrapezoidGradient(
    ctx,
    outX,
    outY,
    outX + outW,
    outY,
    x + w,
    y,
    x,
    y,
    tcx,
    outY,
    tcx,
    y,
    palette.top,
  );
  drawTrapezoidGradient(
    ctx,
    outX + outW,
    outY,
    outX + outW,
    outY + outH,
    x + w,
    y + h,
    x + w,
    y,
    outX + outW,
    tcy,
    x + w,
    tcy,
    palette.right,
  );
  drawTrapezoidGradient(
    ctx,
    outX + outW,
    outY + outH,
    outX,
    outY + outH,
    x,
    y + h,
    x + w,
    y + h,
    tcx,
    outY + outH,
    tcx,
    y + h,
    palette.bottom,
  );
  drawTrapezoidGradient(
    ctx,
    outX,
    outY + outH,
    outX,
    outY,
    x,
    y,
    x,
    y + h,
    outX,
    tcy,
    x,
    tcy,
    palette.left,
  );

  drawTextureOverlay(ctx, outX, outY, outW, outH, x, y, w, h, palette);

  if (style === "wood" && palette.woodGrain) {
    drawWoodGrainOverlay(
      ctx,
      outX,
      outY,
      outW,
      outH,
      x,
      y,
      w,
      h,
      thickness,
      palette.woodGrain.stroke,
      palette.woodGrain.alpha,
      palette.woodGrain.stepScale,
    );
  }

  drawOuterRimHighlight(ctx, outX, outY, outW, outH, palette.rim);

  ctx.save();
  ctx.strokeStyle = palette.innerLine;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  ctx.strokeStyle = palette.innerLineSoft;
  ctx.lineWidth = 0.75;
  ctx.globalAlpha = 0.9;
  ctx.strokeRect(x + 0.35, y + 0.35, w - 0.7, h - 0.7);
  ctx.restore();
};
