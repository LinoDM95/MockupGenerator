/** Anzahl der Beispielmotive für die Endansicht-Vorschau (gedämpfte, harmonische Paletten). */
export const PREVIEW_MOTIF_VARIANT_COUNT = 10;

type Palette = {
  /** Linearer Verlauf: Position 0–1, Farbe */
  linear: [number, string][];
  /** Weiche Kreise: x%, y%, r%, rgba */
  orbs: [number, number, number, string][];
};

const PALETTES: Palette[] = [
  {
    linear: [
      [0, "#b4c2b0"],
      [0.5, "#d8e0d4"],
      [1, "#9aaa96"],
    ],
    orbs: [
      [22, 18, 45, "rgba(255,255,255,0.14)"],
      [78, 72, 38, "rgba(90,100,85,0.1)"],
      [50, 88, 55, "rgba(255,255,255,0.08)"],
    ],
  },
  {
    linear: [
      [0, "#c5aeb0"],
      [0.45, "#e0d2d4"],
      [1, "#a89092"],
    ],
    orbs: [
      [30, 25, 40, "rgba(255,245,245,0.12)"],
      [70, 60, 35, "rgba(120,90,92,0.08)"],
      [55, 85, 50, "rgba(255,255,255,0.06)"],
    ],
  },
  {
    linear: [
      [0, "#a3aeba"],
      [0.5, "#c8d0da"],
      [1, "#85929f"],
    ],
    orbs: [
      [25, 30, 42, "rgba(230,235,245,0.14)"],
      [75, 70, 38, "rgba(70,80,95,0.09)"],
      [48, 50, 48, "rgba(255,255,255,0.07)"],
    ],
  },
  {
    linear: [
      [0, "#c4b8a8"],
      [0.5, "#e0d8cc"],
      [1, "#a89886"],
    ],
    orbs: [
      [28, 22, 44, "rgba(255,252,245,0.13)"],
      [72, 78, 36, "rgba(110,98,82,0.08)"],
      [50, 45, 52, "rgba(255,255,255,0.06)"],
    ],
  },
  {
    linear: [
      [0, "#96b0a8"],
      [0.5, "#b9cec6"],
      [1, "#7a948c"],
    ],
    orbs: [
      [24, 28, 40, "rgba(235,248,242,0.12)"],
      [76, 65, 34, "rgba(60,85,78,0.09)"],
      [52, 82, 45, "rgba(255,255,255,0.07)"],
    ],
  },
  {
    linear: [
      [0, "#b0abbc"],
      [0.5, "#d2cedc"],
      [1, "#8f8a9e"],
    ],
    orbs: [
      [30, 70, 38, "rgba(245,242,255,0.11)"],
      [70, 28, 36, "rgba(90,85,105,0.08)"],
      [50, 48, 50, "rgba(255,255,255,0.06)"],
    ],
  },
  {
    linear: [
      [0, "#cbb6a0"],
      [0.5, "#e5d8c8"],
      [1, "#b09882"],
    ],
    orbs: [
      [22, 75, 42, "rgba(255,248,238,0.12)"],
      [78, 30, 34, "rgba(130,110,90,0.08)"],
      [45, 50, 48, "rgba(255,255,255,0.06)"],
    ],
  },
  {
    linear: [
      [0, "#9aa8a2"],
      [0.5, "#bcc8c2"],
      [1, "#7d8b85"],
    ],
    orbs: [
      [26, 68, 40, "rgba(240,250,245,0.11)"],
      [74, 32, 38, "rgba(65,78,72,0.09)"],
      [50, 20, 55, "rgba(255,255,255,0.05)"],
    ],
  },
  {
    linear: [
      [0, "#a8b6c8"],
      [0.5, "#ccd6e4"],
      [1, "#8896a8"],
    ],
    orbs: [
      [32, 24, 44, "rgba(248,250,255,0.13)"],
      [68, 76, 35, "rgba(80,92,110,0.08)"],
      [50, 52, 46, "rgba(255,255,255,0.06)"],
    ],
  },
  {
    linear: [
      [0, "#ada2aa"],
      [0.5, "#ccc2ca"],
      [1, "#8f848e"],
    ],
    orbs: [
      [28, 48, 42, "rgba(250,245,248,0.1)"],
      [72, 55, 36, "rgba(85,75,82,0.08)"],
      [48, 22, 48, "rgba(255,255,255,0.05)"],
    ],
  },
];

const drawPalette = (ctx: CanvasRenderingContext2D, w: number, h: number, palette: Palette) => {
  const g = ctx.createLinearGradient(0, 0, w, h);
  palette.linear.forEach(([pos, color]) => g.addColorStop(pos, color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (const [ox, oy, r, fill] of palette.orbs) {
    const gr = ctx.createRadialGradient(
      (ox / 100) * w,
      (oy / 100) * h,
      0,
      (ox / 100) * w,
      (oy / 100) * h,
      (r / 100) * Math.min(w, h),
    );
    gr.addColorStop(0, fill);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
  }
};

/** CSS für Mini-Swatch-Buttons (gleiche Stimmung wie das generierte Motiv). */
export const previewVariantSwatchStyle = (variantIndex: number): string => {
  const v = ((variantIndex % PALETTES.length) + PALETTES.length) % PALETTES.length;
  const p = PALETTES[v];
  const a = p.linear[0][1];
  const b = p.linear[p.linear.length - 1][1];
  return `linear-gradient(135deg, ${a}, ${b})`;
};

/**
 * Statisches Beispielmotiv für die Endansicht-Vorschau (kein Netzwerk).
 * Varianten sind bewusst gedämpft, nicht knallbunt.
 */
export const createPreviewMotifDataUrl = (variantIndex = 0): string => {
  const v = ((variantIndex % PALETTES.length) + PALETTES.length) % PALETTES.length;
  const c = document.createElement("canvas");
  const w = 800;
  const h = 1000;
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  drawPalette(ctx, w, h, PALETTES[v]);
  return c.toDataURL("image/jpeg", 0.9);
};
