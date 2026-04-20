import { useCallback, useRef } from "react";

import {
  formatCompanionTileEtaLine,
  type CompanionTileProgressReady,
} from "../lib/companion/companionTileProgress";

/**
 * Sammelt Kachel-Zeiten aus Companion-Polling und formatiert ETA-Zeilen
 * fuer die lokalen Batch-Upscales.
 */
export const useCompanionBatchTileEta = () => {
  const samplesRef = useRef<number[]>([]);
  const finishedCountsRef = useRef<number[]>([]);
  const prevHistLenRef = useRef(0);

  const resetBatch = useCallback(() => {
    samplesRef.current = [];
    finishedCountsRef.current = [];
    prevHistLenRef.current = 0;
  }, []);

  const beginImage = useCallback(() => {
    prevHistLenRef.current = 0;
  }, []);

  const consumeSnapshot = useCallback((snap: CompanionTileProgressReady) => {
    const hist = snap.tile_durations_ms ?? [];
    if (hist.length < prevHistLenRef.current) {
      prevHistLenRef.current = 0;
    }
    const start = prevHistLenRef.current;
    for (let i = start; i < hist.length; i++) {
      const ms = hist[i]!;
      if (Number.isFinite(ms) && ms >= 0) {
        const arr = samplesRef.current;
        samplesRef.current = [...arr.slice(-31), ms];
      }
    }
    if (hist.length > start) {
      prevHistLenRef.current = hist.length;
    }
  }, []);

  const onImageFinished = useCallback((snap: CompanionTileProgressReady) => {
    finishedCountsRef.current.push(Math.max(1, snap.total_tiles ?? 1));
  }, []);

  const formatLine = useCallback(
    (snap: CompanionTileProgressReady, imageIndex: number, totalImages: number) =>
      formatCompanionTileEtaLine({
        snap,
        imageIndex,
        totalImages,
        samples: samplesRef.current,
        finishedImageTileCounts: finishedCountsRef.current,
      }),
    [],
  );

  return {
    resetBatch,
    beginImage,
    consumeSnapshot,
    onImageFinished,
    formatLine,
  };
};
