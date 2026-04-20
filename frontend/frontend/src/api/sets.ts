import type { Template, TemplateElement, TemplateSet } from "../types/mockup";
import { FRAME_SHADOW_ALL, parseSidesMask } from "../lib/editor/frameShadowSides";

import { apiFetch, apiJson } from "./client";

const mediaUrlForBrowser = (url: string): string => {
  if (!url) return url;
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : undefined);
    if (u.pathname.startsWith("/media")) return `${u.pathname}${u.search}`;
  } catch {
    /* ignore */
  }
  return url;
};

/** API-Antwort → Frontend-Typen (Elemente gemischt wie im Prototyp). */
const parseFrameStyle = (raw: unknown): Template["defaultFrameStyle"] => {
  const v = String(raw ?? "none");
  if (v === "none" || v === "black" || v === "white" || v === "wood") return v;
  return "none";
};

const parseFrameDropShadowLegacy = (raw: unknown): boolean => {
  if (raw === true) return true;
  if (raw === false || raw == null) return false;
  const s = String(raw).toLowerCase();
  return s === "1" || s === "true" || s === "yes";
};

const parseOptionalBool = (raw: unknown): boolean | null => {
  if (raw === undefined) return null;
  if (raw === true) return true;
  if (raw === false) return false;
  const s = String(raw).toLowerCase();
  if (s === "1" || s === "true" || s === "yes") return true;
  if (s === "0" || s === "false" || s === "no" || s === "") return false;
  return null;
};

const parseFrameShadowDepth = (raw: unknown): number => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0.82;
  return Math.min(1, Math.max(0.15, n));
};

const parseArtworkSaturation = (raw: unknown): number => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.min(1, Math.max(0.15, n));
};

export const normalizeTemplate = (raw: Record<string, unknown>): Template => {
  const outerSides = parseSidesMask(raw.frame_outer_sides ?? raw.frameOuterSides, FRAME_SHADOW_ALL);
  const innerSides = parseSidesMask(raw.frame_inner_sides ?? raw.frameInnerSides, FRAME_SHADOW_ALL);
  const outerB = parseOptionalBool(raw.frame_shadow_outer_enabled ?? raw.frameShadowOuterEnabled);
  const innerB = parseOptionalBool(raw.frame_shadow_inner_enabled ?? raw.frameShadowInnerEnabled);
  let frameShadowOuterEnabled = false;
  let frameShadowInnerEnabled = false;
  if (outerB !== null || innerB !== null) {
    frameShadowOuterEnabled = outerB ?? false;
    frameShadowInnerEnabled = innerB ?? false;
  } else {
    const dir = String(raw.frame_shadow_direction ?? raw.frameShadowDirection ?? "").toLowerCase();
    if (dir === "outward" || dir === "out" || dir === "external") {
      frameShadowOuterEnabled = true;
    } else if (dir === "inward" || dir === "in" || dir === "internal") {
      frameShadowInnerEnabled = true;
    } else if (parseFrameDropShadowLegacy(raw.frame_drop_shadow ?? raw.frameDropShadow)) {
      frameShadowOuterEnabled = true;
    }
  }
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    width: Number(raw.width),
    height: Number(raw.height),
    bgImage: mediaUrlForBrowser(String(raw.bgImage ?? "")),
    order: raw.order !== undefined ? Number(raw.order) : undefined,
    defaultFrameStyle: parseFrameStyle(raw.default_frame_style ?? raw.defaultFrameStyle),
    frameShadowOuterEnabled,
    frameShadowInnerEnabled,
    frameOuterSides: outerSides,
    frameInnerSides: innerSides,
    frameShadowDepth: parseFrameShadowDepth(raw.frame_shadow_depth ?? raw.frameShadowDepth),
    artworkSaturation: parseArtworkSaturation(raw.artwork_saturation ?? raw.artworkSaturation),
    elements: Array.isArray(raw.elements)
      ? (raw.elements as Record<string, unknown>[]).map(normalizeElement)
      : [],
  };
};

const normalizeElement = (raw: Record<string, unknown>): TemplateElement => {
  const { id, type, ...rest } = raw;
  return {
    id: String(id),
    type: type as TemplateElement["type"],
    ...(rest as Omit<TemplateElement, "id" | "type">),
  } as TemplateElement;
};

export const normalizeSet = (raw: Record<string, unknown>): TemplateSet => ({
  id: String(raw.id),
  name: String(raw.name ?? ""),
  templates: Array.isArray(raw.templates)
    ? (raw.templates as Record<string, unknown>[]).map(normalizeTemplate)
    : [],
});

export const fetchTemplateSets = async (): Promise<TemplateSet[]> => {
  const data = await apiJson<Record<string, unknown>[]>("/api/sets/");
  return data.map(normalizeSet);
};

export const createTemplateSet = async (name: string): Promise<TemplateSet> => {
  const raw = await apiJson<Record<string, unknown>>("/api/sets/", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return normalizeSet(raw);
};

export const patchTemplateSet = async (id: string, name: string): Promise<TemplateSet> => {
  const raw = await apiJson<Record<string, unknown>>(`/api/sets/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  return normalizeSet(raw);
};

export const deleteTemplateSet = async (id: string): Promise<void> => {
  await apiJson(`/api/sets/${id}/`, { method: "DELETE" });
};

export const createTemplateWithUpload = async (
  setId: string,
  file: Blob,
  fileName: string,
  opts?: { name?: string; elements?: TemplateElement[] },
): Promise<Template> => {
  const fd = new FormData();
  fd.append("background_image", file, fileName);
  if (opts?.name) fd.append("name", opts.name);
  if (opts?.elements?.length)
    fd.append("elements", JSON.stringify(opts.elements));
  const raw = await apiJson<Record<string, unknown>>(`/api/sets/${setId}/templates/`, {
    method: "POST",
    body: fd,
  });
  return normalizeTemplate(raw);
};

export const patchTemplate = async (
  id: string,
  data: FormData | Record<string, unknown>,
): Promise<Template> => {
  if (data instanceof FormData) {
    const res = await apiFetch(`/api/templates/${id}/`, { method: "PATCH", body: data });
    const text = await res.text();
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
    return normalizeTemplate(JSON.parse(text) as Record<string, unknown>);
  }
  const raw = await apiJson<Record<string, unknown>>(`/api/templates/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return normalizeTemplate(raw);
};

export const replaceTemplateElements = async (
  templateId: string,
  elements: TemplateElement[],
): Promise<Template> => {
  const raw = await apiJson<Record<string, unknown>>(`/api/templates/${templateId}/elements/`, {
    method: "PUT",
    body: JSON.stringify(elements),
  });
  return normalizeTemplate(raw);
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await apiJson(`/api/templates/${id}/`, { method: "DELETE" });
};

export const exportSetJson = async (setId: string): Promise<TemplateSet> => {
  const raw = await apiJson<Record<string, unknown>>(`/api/sets/${setId}/export/`);
  return normalizeSet(raw);
};

export const importSetJson = async (body: unknown): Promise<TemplateSet> => {
  const raw = await apiJson<Record<string, unknown>>("/api/sets/import/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return normalizeSet(raw);
};
