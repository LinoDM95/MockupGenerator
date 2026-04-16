import { apiJson } from "./client";

export type IntegrationStatusResponse = {
  etsy: boolean;
  gemini: boolean;
  gelato: boolean;
  vertex: boolean;
  cloudflare_r2: boolean;
  pinterest: boolean;
};

export const fetchIntegrationStatus = () =>
  apiJson<IntegrationStatusResponse>("/api/settings/integrations/");

export type SaveIntegrationId = "gemini" | "gelato" | "cloudflare_r2";

export const saveIntegration = (
  integration: SaveIntegrationId,
  payload: Record<string, string>,
) =>
  apiJson<{ ok: boolean }>("/api/settings/integrations/save/", {
    method: "POST",
    body: JSON.stringify({ integration, payload }),
  });

export type TestProviderId = "gemini" | "gelato" | "cloudflare_r2" | "pinterest";

export const testIntegrationConnection = (provider: TestProviderId) =>
  apiJson<{ ok: boolean }>("/api/settings/integrations/test/", {
    method: "POST",
    body: JSON.stringify({ provider }),
  });
