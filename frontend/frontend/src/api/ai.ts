import { apiJson, apiFetch } from "./client";
import { compressFileForAI } from "../lib/canvas/image";

export type AIConnectionStatus = {
  connected: boolean;
  vertex_upscaler_configured?: boolean;
  /** Server-seitig: `REPLICATE_API_TOKEN` in der Backend-.env. */
  replicate_upscale_configured?: boolean;
  provider?: string;
  model_name?: string;
  use_grounding?: boolean;
  prefer_expert_mode?: boolean;
  is_active?: boolean;
  created_at?: string;
};

const AI_STATUS_TTL_MS = 15_000;

let aiStatusClientCache: { at: number; data: AIConnectionStatus } | null = null;
let aiStatusInFlight: Promise<AIConnectionStatus> | null = null;
let aiStatusFetchGen = 0;

/** Nur für Vitest: Client-Cache zurücksetzen. */
export const __resetAiStatusClientStateForTests = (): void => {
  aiStatusClientCache = null;
  aiStatusInFlight = null;
  aiStatusFetchGen = 0;
};

const runAiStatusFetch = (gen: number): Promise<AIConnectionStatus> =>
  apiJson<AIConnectionStatus>("/api/ai/status/").then((data) => {
    if (gen === aiStatusFetchGen) {
      aiStatusClientCache = { at: Date.now(), data };
    }
    return data;
  });

/**
 * KI-Verbindungsstatus: kurze Client-TTL, parallele Aufrufe ein Request.
 * Nach Logout / Disconnect: `invalidateAiStatusClientCache`.
 */
export const fetchAiStatus = (opts?: { force?: boolean }): Promise<AIConnectionStatus> => {
  const force = opts?.force === true;
  if (force) {
    invalidateAiStatusClientCache();
  }
  if (
    !force &&
    aiStatusClientCache &&
    Date.now() - aiStatusClientCache.at < AI_STATUS_TTL_MS
  ) {
    return Promise.resolve(aiStatusClientCache.data);
  }
  if (!force && aiStatusInFlight) {
    return aiStatusInFlight;
  }
  const gen = aiStatusFetchGen;
  const p = runAiStatusFetch(gen).finally(() => {
    if (aiStatusInFlight === p) {
      aiStatusInFlight = null;
    }
  });
  aiStatusInFlight = p;
  return p;
};

export const invalidateAiStatusClientCache = (): void => {
  aiStatusClientCache = null;
  aiStatusFetchGen += 1;
};

export type AIListingResult = {
  titles: string[];
  tags: string[];
  description: string;
};

export const aiConnect = (
  apiKey: string,
  modelName: string,
  provider: string = "gemini",
) => {
  invalidateAiStatusClientCache();
  return apiJson<AIConnectionStatus>("/api/ai/connect/", {
    method: "POST",
    body: JSON.stringify({ api_key: apiKey, model_name: modelName, provider }),
  }).then((data) => {
    aiStatusClientCache = { at: Date.now(), data };
    return data;
  });
};

/** Alias für `fetchAiStatus()` (Client-Cache). */
export const aiStatus = () => fetchAiStatus();

export type AiConnectionPatch = {
  model_name?: string;
  use_grounding?: boolean;
  prefer_expert_mode?: boolean;
};

export const aiPatchConnection = (patch: AiConnectionPatch) =>
  apiJson<AIConnectionStatus>("/api/ai/update-model/", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export const aiUpdateModel = (modelName: string) =>
  aiPatchConnection({ model_name: modelName });

export const aiUpdateGrounding = (enabled: boolean) =>
  aiPatchConnection({ use_grounding: enabled });

export const aiUpdatePreferExpertMode = (enabled: boolean) =>
  aiPatchConnection({ prefer_expert_mode: enabled });

export const aiUpdateVertexServiceAccount = (serviceAccountJson: string) => {
  invalidateAiStatusClientCache();
  return apiJson<AIConnectionStatus>("/api/ai/vertex-service-account/", {
    method: "PATCH",
    body: JSON.stringify({ service_account_json: serviceAccountJson }),
  }).then((data) => {
    aiStatusClientCache = { at: Date.now(), data };
    return data;
  });
};

export const aiDisconnect = async () => {
  await apiFetch("/api/ai/disconnect/", { method: "DELETE" });
  invalidateAiStatusClientCache();
};

export const generateListing = async (
  image: File,
  context: string,
  target: string = "all",
  styleReference: string = "",
): Promise<AIListingResult> => {
  const compressed = await compressFileForAI(image);
  const fd = new FormData();
  fd.append("image", compressed, compressed.name);
  fd.append("context", context);
  fd.append("target", target);
  if (styleReference) fd.append("style_reference", styleReference);
  return apiJson<AIListingResult>("/api/ai/generate-listing/", {
    method: "POST",
    body: fd,
  });
};

export type ExpertListingStepResponse = {
  step: 1 | 2 | 3;
  thought: string;
  data: Record<string, unknown>;
  listing: AIListingResult | null;
  fallback_used: boolean;
  warning?: string;
};

export type GenerateListingExpertOptions = {
  styleReference?: string;
  scoutPayload?: Record<string, unknown>;
  criticPayload?: Record<string, unknown>;
  signal?: AbortSignal;
};

export const generateListingExpertStep = async (
  image: File | undefined,
  context: string,
  target: string,
  step: 1 | 2 | 3,
  options: GenerateListingExpertOptions = {},
): Promise<ExpertListingStepResponse> => {
  const fd = new FormData();
  if (image) {
    const compressed = await compressFileForAI(image);
    fd.append("image", compressed, compressed.name);
  }
  fd.append("context", context);
  fd.append("target", target);
  fd.append("expert_mode", "true");
  fd.append("step", String(step));
  if (options.styleReference) fd.append("style_reference", options.styleReference);
  if (options.scoutPayload) {
    fd.append("scout_payload", JSON.stringify(options.scoutPayload));
  }
  if (options.criticPayload) {
    fd.append("critic_payload", JSON.stringify(options.criticPayload));
  }
  return apiJson<ExpertListingStepResponse>("/api/ai/generate-listing/", {
    method: "POST",
    body: fd,
    signal: options.signal,
  });
};
