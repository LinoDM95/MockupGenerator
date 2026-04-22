import {
  COMPANION_BASE_URL,
  mergeCompanionFetchInit,
} from "../lib/companion/companionConstants";

export type CompanionModelSpeed = "schnell" | "mittel" | "langsamer";

export type CompanionModelEntry = {
  id: string;
  label: string;
  description: string;
  download_url: string;
  ncnn_model_name: string;
  /** Geschaetzte relative Detailtreue im Vergleich (1–5), Orientierung. */
  quality_tier?: number;
  /** Kurzer Hinweis zum erwarteten Erscheinungsbild. */
  quality_summary?: string;
  speed?: CompanionModelSpeed;
  tags?: string[];
};

export type CompanionCatalog = {
  version: number;
  models: CompanionModelEntry[];
};

export type CompanionStatus = {
  status: string;
  version: string;
  installed_model_ids: string[];
  active_model_id: string | null;
  /** true wenn realesrgan-ncnn-vulkan.exe im Companion-Ordner liegt */
  vulkan_runtime_installed?: boolean;
};

export const fetchCompanionCatalog = async (): Promise<CompanionCatalog> => {
  const res = await fetch(
    `${COMPANION_BASE_URL}/models/catalog`,
    mergeCompanionFetchInit(),
  );
  if (!res.ok) {
    throw new Error(`Katalog: HTTP ${res.status}`);
  }
  return (await res.json()) as CompanionCatalog;
};

export const fetchCompanionStatus = async (): Promise<CompanionStatus> => {
  const res = await fetch(
    `${COMPANION_BASE_URL}/status`,
    mergeCompanionFetchInit(),
  );
  if (!res.ok) {
    throw new Error(`Status: HTTP ${res.status}`);
  }
  return (await res.json()) as CompanionStatus;
};

export const installCompanionModel = async (modelId: string): Promise<void> => {
  const res = await fetch(
    `${COMPANION_BASE_URL}/install-model`,
    mergeCompanionFetchInit({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: modelId }),
    }),
  );
  if (!res.ok) {
    let detail = await res.text();
    try {
      const j = JSON.parse(detail) as { detail?: unknown };
      if (typeof j.detail === "string") detail = j.detail;
    } catch {
      /* keep */
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
};

export const setCompanionActiveModel = async (modelId: string): Promise<void> => {
  const res = await fetch(
    `${COMPANION_BASE_URL}/models/active`,
    mergeCompanionFetchInit({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: modelId }),
    }),
  );
  if (!res.ok) {
    let detail = await res.text();
    try {
      const j = JSON.parse(detail) as { detail?: unknown };
      if (typeof j.detail === "string") detail = j.detail;
    } catch {
      /* keep */
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
};

export const uninstallCompanionModel = async (modelId: string): Promise<void> => {
  const res = await fetch(
    `${COMPANION_BASE_URL}/uninstall-model`,
    mergeCompanionFetchInit({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: modelId }),
    }),
  );
  if (!res.ok) {
    let detail = await res.text();
    try {
      const j = JSON.parse(detail) as { detail?: unknown };
      if (typeof j.detail === "string") detail = j.detail;
    } catch {
      /* keep */
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
};

export const uninstallCompanionVulkanRuntime = async (): Promise<void> => {
  const res = await fetch(
    `${COMPANION_BASE_URL}/uninstall-vulkan-runtime`,
    mergeCompanionFetchInit({ method: "POST" }),
  );
  if (!res.ok) {
    let detail = await res.text();
    try {
      const j = JSON.parse(detail) as { detail?: unknown };
      if (typeof j.detail === "string") detail = j.detail;
    } catch {
      /* keep */
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
};
