import { useCallback, useMemo, useState } from "react";

import { formatRemainingMs } from "../lib/workSession/formatEta";

const MAX_SAMPLES = 12;
const EWMA_ALPHA = 0.38;

const ewma = (values: number[]): number | null => {
  if (values.length === 0) return null;
  let e = values[0]!;
  for (let i = 1; i < values.length; i++) {
    e = EWMA_ALPHA * values[i]! + (1 - EWMA_ALPHA) * e;
  }
  return e;
};

/**
 * Schätzt Restzeit aus gemessenen Schritt-Dauern (Client-only, grobe Näherung).
 */
export const useWorkSessionEta = () => {
  const [durationsMs, setDurationsMs] = useState<number[]>([]);

  const reset = useCallback(() => setDurationsMs([]), []);

  const recordSample = useCallback((ms: number) => {
    if (!Number.isFinite(ms) || ms < 0) return;
    setDurationsMs((prev) => [...prev.slice(-(MAX_SAMPLES - 1)), ms]);
  }, []);

  const predictedMsPerUnit = useMemo(() => ewma(durationsMs), [durationsMs]);

  const getRemainingLabel = useCallback(
    (remainingUnits: number): string | null => {
      if (remainingUnits <= 0) return null;
      if (predictedMsPerUnit == null) {
        return "Restzeit wird geschätzt …";
      }
      const ms = predictedMsPerUnit * remainingUnits;
      return `Rest ca. ${formatRemainingMs(ms)}`;
    },
    [predictedMsPerUnit],
  );

  return { recordSample, reset, getRemainingLabel, predictedMsPerUnit };
};
