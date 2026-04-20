/** Muss zu UPSCALE_MAX_OUTPUT_PIXELS (Backend/Companion) passen — UI-Hinweis Kachelung. */

const DEFAULT_PX = 17_000_000;
const MIN_PX = 4_000_000;
const MAX_PX = 67_108_864;

const parseViteCap = (): number => {
  const raw = import.meta.env.VITE_UPSCALE_MAX_OUTPUT_PIXELS;
  if (raw == null || String(raw).trim() === "") return DEFAULT_PX;
  const n = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < MIN_PX || n > MAX_PX) return DEFAULT_PX;
  return n;
};

export const UPSCALE_MAX_OUTPUT_PIXELS = parseViteCap();
