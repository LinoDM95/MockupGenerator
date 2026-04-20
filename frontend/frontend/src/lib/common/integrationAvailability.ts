/**
 * Welche Integrationen im Hub **eingerichtet** werden dürfen (OAuth / Keys).
 * `false` = Karte gesperrt und ausgegraut (Feature noch nicht produktionsreif).
 */
export type HubTabId = "etsy" | "gelato" | "gemini" | "cloudflare_r2" | "pinterest";

const HUB_UI_ENABLED: Record<HubTabId, boolean> = {
  gelato: true,
  gemini: true,
  cloudflare_r2: true,
  etsy: false,
  pinterest: false,
};

export const isIntegrationHubUiEnabled = (id: HubTabId): boolean => HUB_UI_ENABLED[id] === true;

/** Standard-Tab, falls z. B. „etsy“ nicht mehr wählbar ist. */
export const getDefaultHubTab = (): HubTabId => {
  const order: HubTabId[] = ["gelato", "gemini", "cloudflare_r2", "etsy", "pinterest"];
  const hit = order.find((id) => isIntegrationHubUiEnabled(id));
  return hit ?? "gelato";
};
