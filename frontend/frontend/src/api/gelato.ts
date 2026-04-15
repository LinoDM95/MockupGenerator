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
export const gelatoConnect = (apiKey: string) =>
  apiJson<{ stores: GelatoStore[] }>("/api/gelato/connect/", {
    method: "POST",
    body: JSON.stringify({ api_key: apiKey }),
  });

/** Step 2: Select store from list. */
export const gelatoSelectStore = (storeId: string, storeName: string) =>
  apiJson<GelatoConnectionStatus>("/api/gelato/select-store/", {
    method: "POST",
    body: JSON.stringify({ store_id: storeId, store_name: storeName }),
  });

export const gelatoDisconnect = async () => {
  await apiFetch("/api/gelato/disconnect/", { method: "DELETE" });
};

export const gelatoStatus = () =>
  apiJson<GelatoConnectionStatus>("/api/gelato/status/");

export const gelatoListTemplates = () =>
  apiJson<GelatoTemplate[]>("/api/gelato/templates/");

export const gelatoSyncTemplates = (templateIds: string[]) =>
  apiJson<TemplateSyncResponse>("/api/gelato/templates/sync/", {
    method: "POST",
    body: JSON.stringify({ template_ids: templateIds }),
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
