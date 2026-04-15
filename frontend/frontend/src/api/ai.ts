import { apiJson, apiFetch } from "./client";
import { compressFileForAI } from "../lib/canvas/image";

export type AIConnectionStatus = {
  connected: boolean;
  vertex_upscaler_configured?: boolean;
  provider?: string;
  model_name?: string;
  use_grounding?: boolean;
  prefer_expert_mode?: boolean;
  is_active?: boolean;
  created_at?: string;
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
) =>
  apiJson<AIConnectionStatus>("/api/ai/connect/", {
    method: "POST",
    body: JSON.stringify({ api_key: apiKey, model_name: modelName, provider }),
  });

export const aiStatus = () =>
  apiJson<AIConnectionStatus>("/api/ai/status/");

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

export const aiUpdateVertexServiceAccount = (serviceAccountJson: string) =>
  apiJson<AIConnectionStatus>("/api/ai/vertex-service-account/", {
    method: "PATCH",
    body: JSON.stringify({ service_account_json: serviceAccountJson }),
  });

export const aiDisconnect = async () => {
  await apiFetch("/api/ai/disconnect/", { method: "DELETE" });
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
