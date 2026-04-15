import { apiJson } from "./client";

export type EtsyOAuthStartResponse = { authorization_url: string; state?: string };

export type EtsyConnectionStatus = {
  connected: boolean;
  shop_id?: number | null;
};

export type EtsyListingImage = {
  listing_image_id?: number;
  listingImageId?: number;
  rank?: number;
  url_fullxfull?: string;
  url_570xN?: string;
  url_75x75?: string;
};

export type EtsyListing = {
  listing_id?: number;
  listingId?: number;
  title?: string;
  images?: EtsyListingImage[];
};

export type EtsyListingsResponse = {
  count: number;
  results: EtsyListing[];
};

export type EtsyBulkJob = {
  id: string;
  status: string;
  payload: unknown;
  result: { errors?: unknown[]; done?: unknown[] } | null;
  error_log: string;
  celery_task_id: string;
  created_at: string;
  updated_at: string;
};

export const etsyOAuthStart = () =>
  apiJson<EtsyOAuthStartResponse>("/api/etsy/oauth/start/", { method: "GET" });

export const etsyOAuthCallback = (body: { code: string; state: string }) =>
  apiJson<{ ok?: boolean; shop_id?: number; detail?: string; partial?: boolean }>(
    "/api/etsy/oauth/callback/",
    { method: "POST", body: JSON.stringify(body) },
  );

export const etsyDisconnect = async () => {
  await apiJson("/api/etsy/oauth/disconnect/", { method: "DELETE" });
};

export const etsyFetchListings = (params?: { limit?: number; offset?: number }) => {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const s = q.toString();
  return apiJson<EtsyListingsResponse>(`/api/etsy/listings/${s ? `?${s}` : ""}`);
};

export const etsyUploadBulkAsset = async (blob: Blob, filename = "mockup.png") => {
  const fd = new FormData();
  fd.append("image", blob, filename);
  return apiJson<{ id: string }>("/api/etsy/bulk-assets/", { method: "POST", body: fd });
};

export const etsyCreateBulkJob = (body: unknown) =>
  apiJson<EtsyBulkJob>("/api/etsy/bulk-jobs/", { method: "POST", body: JSON.stringify(body) });

export const etsyGetBulkJob = (jobId: string) =>
  apiJson<EtsyBulkJob>(`/api/etsy/bulk-jobs/${jobId}/`);
