import { COMPANION_BASE_URL } from "./companionConstants";
import { formatRemainingMs } from "./workSession/formatEta";

const EWMA_ALPHA = 0.38;

export type CompanionTileProgressWaiting = {
  ready: false;
  finished?: boolean;
};

export type CompanionTileProgressReady = {
  ready: true;
  total_tiles: number;
  completed_tiles: number;
  tile_durations_ms: number[];
  finished: boolean;
};

export type CompanionTileProgressResponse =
  | CompanionTileProgressWaiting
  | CompanionTileProgressReady;

export const fetchCompanionTileProgress = async (
  jobId: string,
): Promise<CompanionTileProgressResponse> => {
  const res = await fetch(
    `${COMPANION_BASE_URL}/tile-progress/${encodeURIComponent(jobId)}`,
  );
  if (!res.ok) {
    throw new Error(`tile-progress: HTTP ${res.status}`);
  }
  return (await res.json()) as CompanionTileProgressResponse;
};

const ewmaTileMs = (samples: number[]): number | null => {
  if (samples.length === 0) return null;
  let e = samples[0]!;
  for (let i = 1; i < samples.length; i++) {
    e = EWMA_ALPHA * samples[i]! + (1 - EWMA_ALPHA) * e;
  }
  return e;
};

/** Schätzt Restzeit aus Kachel-Dauern (aktuelles Bild + folgende Dateien). */
export const estimateRemainingTilesMs = (p: {
  samples: readonly number[];
  currentTotalTiles: number;
  currentCompletedTiles: number;
  remainingWholeImages: number;
  finishedImageTileCounts: readonly number[];
}): number | null => {
  const avg = ewmaTileMs([...p.samples]);
  if (avg == null) return null;
  const remCur = Math.max(0, p.currentTotalTiles - p.currentCompletedTiles);
  const fc = p.finishedImageTileCounts;
  const avgTilesPerImg =
    fc.length > 0
      ? fc.reduce((a, b) => a + b, 0) / fc.length
      : Math.max(1, p.currentTotalTiles);
  const guess = Math.max(1, Math.round(avgTilesPerImg));
  const remTiles = remCur + p.remainingWholeImages * guess;
  return avg * remTiles;
};

export const formatCompanionTileEtaLine = (p: {
  snap: CompanionTileProgressReady;
  imageIndex: number;
  totalImages: number;
  samples: readonly number[];
  finishedImageTileCounts: readonly number[];
}): string => {
  const { snap, imageIndex, totalImages, samples, finishedImageTileCounts } =
    p;
  const remImg = Math.max(0, totalImages - imageIndex - 1);
  const eta = estimateRemainingTilesMs({
    samples,
    currentTotalTiles: Math.max(1, snap.total_tiles ?? 1),
    currentCompletedTiles: snap.completed_tiles ?? 0,
    remainingWholeImages: remImg,
    finishedImageTileCounts,
  });
  const kachel = `${snap.completed_tiles ?? 0}/${snap.total_tiles ?? "?"}`;
  const head = `Bild ${imageIndex + 1}/${totalImages} · Kachel ${kachel}`;
  if (eta == null) return `${head} · Restzeit wird geschätzt …`;
  return `${head} · Rest ca. ${formatRemainingMs(eta)}`;
};
