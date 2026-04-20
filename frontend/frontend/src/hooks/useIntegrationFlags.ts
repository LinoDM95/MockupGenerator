import { useCallback, useEffect, useState } from "react";

import type { IntegrationStatusResponse } from "../api/settings";
import { fetchIntegrationStatus } from "../api/settings";

export type IntegrationFlags = {
  gelato: boolean;
  gemini: boolean;
  vertex: boolean;
  etsy: boolean;
  pinterest: boolean;
  /** True nur bis zum ersten erfolgreichen Abruf (kein Status in Hand). */
  loading: boolean;
  /** Sanft: Client-TTL / Dedup wie `fetchIntegrationStatus()`. */
  refetch: () => Promise<void>;
  /** Hart: Cache verwerfen, z. B. nach Save im Setup wenn sofort frische Flags nötig sind. */
  refetchHard: () => Promise<void>;
};

/**
 * GET /api/settings/integrations/ — nutzt Client-Cache (siehe fetchIntegrationStatus).
 * Kein force beim Mount, damit parallele Views einen Request teilen.
 */
export const useIntegrationFlags = (): IntegrationFlags => {
  const [status, setStatus] = useState<IntegrationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const s = await fetchIntegrationStatus();
        if (!cancelled) setStatus(s);
      } catch {
        if (!cancelled) setStatus(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = useCallback(async () => {
    try {
      const s = await fetchIntegrationStatus();
      setStatus(s);
    } catch {
      setStatus(null);
    }
  }, []);

  const refetchHard = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchIntegrationStatus({ force: true });
      setStatus(s);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    gelato: !!status?.gelato,
    gemini: !!status?.gemini,
    vertex: !!status?.vertex,
    etsy: !!status?.etsy,
    pinterest: !!status?.pinterest,
    loading,
    refetch,
    refetchHard,
  };
};
