import { ApiError, apiFetch } from "./client";

export type UpscaleFactor = "x2" | "x4";

export type UpscaleResult = {
  blob: Blob;
  originalWidth: number;
  originalHeight: number;
  upscaledWidth: number;
  upscaledHeight: number;
};

/** Vertex AI (aiplatform) API not enabled for the user's GCP project — use activationUrl. */
export class UpscaleVertexApiNotEnabledError extends Error {
  readonly activationUrl: string;

  constructor(message: string, activationUrl: string) {
    super(message);
    this.name = "UpscaleVertexApiNotEnabledError";
    this.activationUrl = activationUrl;
  }
}

const throwUpscaleHttpError = (res: Response, bodyText: string): never => {
  if (res.status === 401) {
    throw new ApiError(
      "HTTP 401",
      401,
      JSON.stringify({
        detail:
          "Deine Sitzung ist abgelaufen oder du bist nicht angemeldet. Bitte Seite neu laden, erneut anmelden und den Upscaler noch einmal starten.",
      }),
    );
  }

  try {
    const j = JSON.parse(bodyText) as Record<string, unknown>;
    if (
      j.error_type === "api_not_enabled" &&
      typeof j.activation_url === "string"
    ) {
      const msg =
        typeof j.message === "string"
          ? j.message
          : "Die Vertex AI API ist nicht aktiviert.";
      throw new UpscaleVertexApiNotEnabledError(msg, j.activation_url);
    }
  } catch (e) {
    if (e instanceof UpscaleVertexApiNotEnabledError) {
      throw e;
    }
  }
  throw new ApiError(`HTTP ${res.status}`, res.status, bodyText);
};

export const upscaleImage = async (
  file: File,
  factor: UpscaleFactor,
  options?: { signal?: AbortSignal },
): Promise<UpscaleResult> => {
  const form = new FormData();
  form.append("image", file);
  form.append("factor", factor);

  const res = await apiFetch("/api/upscaler/upscale/", {
    method: "POST",
    body: form,
    signal: options?.signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throwUpscaleHttpError(res, text);
  }

  const originalWidth = Number(res.headers.get("X-Original-Width") || 0);
  const originalHeight = Number(res.headers.get("X-Original-Height") || 0);
  const upscaledWidth = Number(res.headers.get("X-Upscaled-Width") || 0);
  const upscaledHeight = Number(res.headers.get("X-Upscaled-Height") || 0);

  const blob = await res.blob();

  return { blob, originalWidth, originalHeight, upscaledWidth, upscaledHeight };
};
