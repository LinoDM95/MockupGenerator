import { apiJson, apiFetch } from "./client";

export type GelatoConnectionStatus = {
  connected: boolean;
  store_id?: string;
  store_name?: string;
  is_active?: boolean;
  created_at?: string;
};

export type GelatoStore = {
  id: string;
  name: string;
};

export type GelatoTemplate = {
  id: number;
  gelato_template_id: string;
  name: string;
  preview_url: string;
  is_active: boolean;
  synced_at: string;
};

const GELATO_STATUS_TTL_MS = 15_000;
const GELATO_TEMPLATES_TTL_MS = 30_000;

let gelatoStatusClientCache: { at: number; data: GelatoConnectionStatus } | null = null;
let gelatoTemplatesClientCache: {
  at: number;
  data: GelatoTemplate[];
  cacheGen: number;
} | null = null;
let gelatoStatusInFlight: Promise<GelatoConnectionStatus> | null = null;
let gelatoTemplatesInFlight: Promise<GelatoTemplate[]> | null = null;
let gelatoClientFetchGen = 0;

/** Nur für Vitest: Client-Caches zurücksetzen. */
export const __resetGelatoClientStateForTests = (): void => {
  gelatoStatusClientCache = null;
  gelatoTemplatesClientCache = null;
  gelatoStatusInFlight = null;
  gelatoTemplatesInFlight = null;
  gelatoClientFetchGen = 0;
};

export const invalidateGelatoClientCache = (): void => {
  gelatoStatusClientCache = null;
  gelatoTemplatesClientCache = null;
  gelatoClientFetchGen += 1;
};

const runGelatoStatusFetch = (gen: number): Promise<GelatoConnectionStatus> =>
  apiJson<GelatoConnectionStatus>("/api/gelato/status/").then((data) => {
    if (gen === gelatoClientFetchGen) {
      gelatoStatusClientCache = { at: Date.now(), data };
    }
    return data;
  });

const runGelatoTemplatesFetch = (gen: number): Promise<GelatoTemplate[]> =>
  apiJson<GelatoTemplate[]>("/api/gelato/templates/").then((data) => {
    if (gen === gelatoClientFetchGen) {
      gelatoTemplatesClientCache = { at: Date.now(), data, cacheGen: gen };
    }
    return data;
  });

/**
 * Gelato-Verbindungsstatus: Client-TTL, parallele Aufrufe ein Request.
 */
export const fetchGelatoStatus = (opts?: { force?: boolean }): Promise<GelatoConnectionStatus> => {
  const force = opts?.force === true;
  if (force) {
    invalidateGelatoClientCache();
  }
  if (
    !force &&
    gelatoStatusClientCache &&
    Date.now() - gelatoStatusClientCache.at < GELATO_STATUS_TTL_MS
  ) {
    return Promise.resolve(gelatoStatusClientCache.data);
  }
  if (!force && gelatoStatusInFlight) {
    return gelatoStatusInFlight;
  }
  const gen = gelatoClientFetchGen;
  const p = runGelatoStatusFetch(gen).finally(() => {
    if (gelatoStatusInFlight === p) {
      gelatoStatusInFlight = null;
    }
  });
  gelatoStatusInFlight = p;
  return p;
};

/**
 * Gelato-Vorlagenliste (nur sinnvoll bei verbundenem Store).
 */
export const fetchGelatoListTemplates = (opts?: {
  force?: boolean;
}): Promise<GelatoTemplate[]> => {
  const force = opts?.force === true;
  if (force) {
    gelatoTemplatesClientCache = null;
    gelatoTemplatesInFlight = null;
  }
  const gen = gelatoClientFetchGen;
  if (
    !force &&
    gelatoTemplatesClientCache &&
    gelatoTemplatesClientCache.cacheGen === gen &&
    Date.now() - gelatoTemplatesClientCache.at < GELATO_TEMPLATES_TTL_MS
  ) {
    return Promise.resolve(gelatoTemplatesClientCache.data);
  }
  if (!force && gelatoTemplatesInFlight) {
    return gelatoTemplatesInFlight;
  }
  const p = runGelatoTemplatesFetch(gen).finally(() => {
    if (gelatoTemplatesInFlight === p) {
      gelatoTemplatesInFlight = null;
    }
  });
  gelatoTemplatesInFlight = p;
  return p;
};

export type GelatoExportTask = {
  id: string;
  status: "pending" | "processing" | "success" | "failed";
  title: string;
  gelato_product_id: string;
  gelato_product_uid: string;
  error_message: string;
  created_at: string;
  updated_at: string;
};

export type TemplateSyncResponse =
  | GelatoTemplate[]
  | { templates: GelatoTemplate[]; errors: { template_id: string; detail: string }[] };

/** Step 1: Send API key, get back list of stores. */
export const gelatoConnect = (apiKey: string) => {
  invalidateGelatoClientCache();
  return apiJson<{ stores: GelatoStore[] }>("/api/gelato/connect/", {
    method: "POST",
    body: JSON.stringify({ api_key: apiKey }),
  });
};

/** Step 2: Select store from list. */
export const gelatoSelectStore = (storeId: string, storeName: string) => {
  invalidateGelatoClientCache();
  return apiJson<GelatoConnectionStatus>("/api/gelato/select-store/", {
    method: "POST",
    body: JSON.stringify({ store_id: storeId, store_name: storeName }),
  }).then((data) => {
    gelatoStatusClientCache = { at: Date.now(), data };
    gelatoTemplatesClientCache = null;
    return data;
  });
};

export const gelatoDisconnect = async () => {
  await apiFetch("/api/gelato/disconnect/", { method: "DELETE" });
  invalidateGelatoClientCache();
};

export const gelatoStatus = () => fetchGelatoStatus();

export const gelatoListTemplates = () => fetchGelatoListTemplates();

export const gelatoSyncTemplates = (templateIds: string[]) =>
  apiJson<TemplateSyncResponse>("/api/gelato/templates/sync/", {
    method: "POST",
    body: JSON.stringify({ template_ids: templateIds }),
  }).then((res) => {
    gelatoTemplatesClientCache = null;
    return res;
  });

export type ArtworkMetadata = {
  title: string;
  description: string;
  tags: string;
};

export const gelatoStartExport = (
  templateId: number,
  artworkFiles: File[],
  metadataList: ArtworkMetadata[],
  freeShipping: boolean,
) => {
  const fd = new FormData();
  fd.append("template_id", String(templateId));
  fd.append("free_shipping", freeShipping ? "true" : "false");
  fd.append("metadata", JSON.stringify(metadataList));
  for (const f of artworkFiles) fd.append("artworks", f, f.name);
  return apiJson<GelatoExportTask[]>("/api/gelato/export/", {
    method: "POST",
    body: fd,
  });
};

export const gelatoGetTaskStatus = (taskIds: string[]) =>
  apiJson<GelatoExportTask[]>(`/api/gelato/tasks/?task_ids=${taskIds.join(",")}`);

export type GelatoTempUploadResponse = {
  id: string;
  image: string;
  public_url: string;
  uploaded_at: string;
};

/** Ein Bild nach R2 (temp) laden — öffentliche URL für Pinterest & Co. */
export const gelatoUploadTempImage = (file: File) => {
  const fd = new FormData();
  fd.append("image", file, file.name);
  return apiJson<GelatoTempUploadResponse>("/api/gelato/upload-temp-image/", {
    method: "POST",
    body: fd,
  });
};
