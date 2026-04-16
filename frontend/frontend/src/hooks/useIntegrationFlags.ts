import { useCallback, useEffect, useState } from "react";

import type { IntegrationStatusResponse } from "../api/settings";
import { fetchIntegrationStatus } from "../api/settings";

export type IntegrationFlags = {
  gelato: boolean;
  gemini: boolean;
  vertex: boolean;
  etsy: boolean;
  pinterest: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
};

/**
 * Einmaliger Abruf von GET /api/settings/integrations/ für Callouts und Hinweise.
 */
export const useIntegrationFlags = (): IntegrationFlags => {
  const [status, setStatus] = useState<IntegrationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchIntegrationStatus();
      setStatus(s);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    gelato: !!status?.gelato,
    gemini: !!status?.gemini,
    vertex: !!status?.vertex,
    etsy: !!status?.etsy,
    pinterest: !!status?.pinterest,
    loading,
    refetch,
  };
};
