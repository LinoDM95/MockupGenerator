import { UPSCALE_MAX_OUTPUT_PIXELS } from "./upscaleMaxOutputPixels";

/** Wie im Backend: `int(math.isqrt(n))` */
const isqrt = (n: number): number => {
  if (n <= 0) return 0;
  let r = Math.floor(Math.sqrt(n));
  while (r * r > n) r -= 1;
  while ((r + 1) * (r + 1) <= n) r += 1;
  return r;
};

const OVERLAP_SRC = 64;
export const REPLICATE_TILING_MAX_PARALLEL = 8;

const tilingGridDims = (
  w: number,
  h: number,
  overlap: number,
  step: number,
): [number, number] => {
  const cols = Math.max(1, Math.ceil((w - overlap) / step));
  const rows = Math.max(1, Math.ceil((h - overlap) / step));
  return [cols, rows];
};

const tileCountForNativePass = (
  w: number,
  h: number,
  nativeInt: 2 | 4,
): number => {
  const maxTilePx = isqrt(UPSCALE_MAX_OUTPUT_PIXELS);
  const maxTileSrc = Math.floor(maxTilePx / nativeInt);
  if (maxTileSrc < 128) return 1;
  const overlap = Math.min(OVERLAP_SRC, Math.floor(maxTileSrc / 4));
  const step = maxTileSrc - overlap;
  const [cols, rows] = tilingGridDims(w, h, overlap, step);
  return cols * rows;
};

const nativeStepsForTotalFactor = (total: 2 | 4 | 8 | 16): (2 | 4)[] => {
  if (total === 2) return [2];
  if (total === 4) return [4];
  if (total === 8) return [4, 2];
  return [4, 4];
};

/**
 * Max. parallele Kachel-API-Calls (Backend: `min(8, total_tiles)`) pro Lauf
 * abgeschätzt aus Quell-Abmessungen und Faktor — entspricht der Server-Logik
 * ohne Smart-Scale-Optimierung; kann um ±1 abweichen.
 */
export const maxReplicateParallelWorkers = (
  ow: number,
  oh: number,
  totalFactor: 2 | 4 | 8 | 16,
): number => {
  if (ow < 1 || oh < 1) return REPLICATE_TILING_MAX_PARALLEL;
  const steps = nativeStepsForTotalFactor(totalFactor);
  let w = ow;
  let h = oh;
  let maxP = 1;
  for (const n of steps) {
    if (n !== 2 && n !== 4) continue;
    const tiles = tileCountForNativePass(
      Math.round(w),
      Math.round(h),
      n,
    );
    maxP = Math.max(maxP, Math.min(REPLICATE_TILING_MAX_PARALLEL, tiles));
    w = Math.round(w * n);
    h = Math.round(h * n);
  }
  return maxP;
};

export const formatReplicateSessionEta = (
  parallelWorkers: number,
  restLine: string | null,
): string => {
  const k = `Replicate: ${parallelWorkers} Kacheln parallel`;
  if (restLine) return `${k} — ${restLine}`;
  return k;
};
