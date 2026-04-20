import { apiJson } from "./client";

export type IntegrationStatusResponse = {
  etsy: boolean;
  gemini: boolean;
  gelato: boolean;
  vertex: boolean;
  cloudflare_r2: boolean;
  pinterest: boolean;
};

const CLIENT_STATUS_TTL_MS = 10_000;

let integrationStatusClientCache: {
  at: number;
  data: IntegrationStatusResponse;
} | null = null;

let integrationStatusInFlight: Promise<IntegrationStatusResponse> | null = null;

/** Erhöht bei Invalidate — verhindert, dass ein noch laufender Request nach Save den Cache mit Altstand füllt. */
let integrationStatusFetchGen = 0;

/** Nur für Vitest: Modulzustand der Client-seitigen Integrations-Caches zurücksetzen. */
export const __resetIntegrationStatusClientStateForTests = (): void => {
  integrationStatusClientCache = null;
  integrationStatusInFlight = null;
  integrationStatusFetchGen = 0;
};

const runIntegrationStatusFetch = (
  gen: number,
): Promise<IntegrationStatusResponse> =>
  apiJson<IntegrationStatusResponse>("/api/settings/integrations/").then((data) => {
    if (gen === integrationStatusFetchGen) {
      integrationStatusClientCache = { at: Date.now(), data };
    }
    return data;
  });

/**
 * Integrations-Flags: parallele Aufrufe werden zusammengeführt (ein Request);
 * kurze Client-TTL entlastet API und DB bei vielen gleichzeitig gemounteten Views.
 */
export const fetchIntegrationStatus = (opts?: { force?: boolean }): Promise<IntegrationStatusResponse> => {
  const force = opts?.force === true;
  if (force) {
    invalidateIntegrationStatusClientCache();
  }
  if (
    !force &&
    integrationStatusClientCache &&
    Date.now() - integrationStatusClientCache.at < CLIENT_STATUS_TTL_MS
  ) {
    return Promise.resolve(integrationStatusClientCache.data);
  }
  if (!force && integrationStatusInFlight) {
    return integrationStatusInFlight;
  }
  const gen = integrationStatusFetchGen;
  const p = runIntegrationStatusFetch(gen).finally(() => {
    if (integrationStatusInFlight === p) {
      integrationStatusInFlight = null;
    }
  });
  integrationStatusInFlight = p;
  return p;
};

/** Nach Logout; nach Save wird zusätzlich gen erhöht (siehe saveIntegration). */
export const invalidateIntegrationStatusClientCache = (): void => {
  integrationStatusClientCache = null;
  integrationStatusFetchGen += 1;
};

export type SaveIntegrationId = "gemini" | "gelato" | "cloudflare_r2";

export const saveIntegration = (
  integration: SaveIntegrationId,
  payload: Record<string, string>,
) =>
  apiJson<{ ok: boolean }>("/api/settings/integrations/save/", {
    method: "POST",
    body: JSON.stringify({ integration, payload }),
  }).then((res) => {
    invalidateIntegrationStatusClientCache();
    return res;
  });

export type TestProviderId = "gemini" | "gelato" | "cloudflare_r2" | "pinterest";

export const testIntegrationConnection = (provider: TestProviderId) =>
  apiJson<{ ok: boolean }>("/api/settings/integrations/test/", {
    method: "POST",
    body: JSON.stringify({ provider }),
  });
