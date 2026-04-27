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

const parseUnit01 = (raw: unknown, fallback: number): number => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
};

const parseFoldSmoothing = (raw: unknown): number => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 4;
  return Math.min(32, Math.max(1, Math.round(n)));
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
    foldsEnabled: parseOptionalBool(raw.folds_enabled ?? raw.foldsEnabled) === true,
    foldStrength: parseUnit01(raw.fold_strength ?? raw.foldStrength, 0.4),
    foldShadowDepth: parseUnit01(raw.fold_shadow_depth ?? raw.foldShadowDepth, 0.6),
    foldHighlightStrength: parseUnit01(
      raw.fold_highlight_strength ?? raw.foldHighlightStrength,
      0.25,
    ),
    foldSmoothing: parseFoldSmoothing(raw.fold_smoothing ?? raw.foldSmoothing),
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

const SETS_LIST_TTL_MS = 15_000;

type PaginatedSetsPayload = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Record<string, unknown>[];
};

const listPathFromPaginationNext = (next: string | null): string | null => {
  if (!next) return null;
  try {
    const u = new URL(next, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return `${u.pathname}${u.search}`;
  } catch {
    return null;
  }
};

let setsListClientCache: { at: number; data: TemplateSet[] } | null = null;
let setsListInFlight: Promise<TemplateSet[]> | null = null;
let setsListFetchGen = 0;

/** Nur für Vitest. */
export const __resetTemplateSetsListClientStateForTests = (): void => {
  setsListClientCache = null;
  setsListInFlight = null;
  setsListFetchGen = 0;
};

export const invalidateTemplateSetsListCache = (): void => {
  setsListClientCache = null;
  setsListFetchGen += 1;
};

const runFetchTemplateSetsList = async (gen: number): Promise<TemplateSet[]> => {
  const limit = 200;
  let path: string | null = `/api/sets/?limit=${limit}`;
  const merged: TemplateSet[] = [];

  while (path) {
    const raw = await apiJson<PaginatedSetsPayload | Record<string, unknown>[]>(path);
    if (Array.isArray(raw)) {
      const normalized = raw.map(normalizeSet);
      if (gen === setsListFetchGen) {
        setsListClientCache = { at: Date.now(), data: normalized };
      }
      return normalized;
    }
    merged.push(...raw.results.map((r) => normalizeSet(r)));
    path = listPathFromPaginationNext(raw.next);
  }

  if (gen === setsListFetchGen) {
    setsListClientCache = { at: Date.now(), data: merged };
  }
  return merged;
};

/**
 * GET /api/sets/ — Client-TTL; nach Änderungen an Sets/Vorlagen invalidieren.
 */
export const fetchTemplateSets = (opts?: { force?: boolean }): Promise<TemplateSet[]> => {
  const force = opts?.force === true;
  if (force) {
    invalidateTemplateSetsListCache();
  }
  if (!force && setsListClientCache && Date.now() - setsListClientCache.at < SETS_LIST_TTL_MS) {
    return Promise.resolve(setsListClientCache.data);
  }
  if (!force && setsListInFlight) {
    return setsListInFlight;
  }
  const gen = setsListFetchGen;
  const p = runFetchTemplateSetsList(gen).finally(() => {
    if (setsListInFlight === p) {
      setsListInFlight = null;
    }
  });
  setsListInFlight = p;
  return p;
};

export const createTemplateSet = async (name: string): Promise<TemplateSet> => {
  const raw = await apiJson<Record<string, unknown>>("/api/sets/", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  invalidateTemplateSetsListCache();
  return normalizeSet(raw);
};

export const patchTemplateSet = async (id: string, name: string): Promise<TemplateSet> => {
  const raw = await apiJson<Record<string, unknown>>(`/api/sets/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  invalidateTemplateSetsListCache();
  return normalizeSet(raw);
};

export const deleteTemplateSet = async (id: string): Promise<void> => {
  await apiJson(`/api/sets/${id}/`, { method: "DELETE" });
  invalidateTemplateSetsListCache();
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
  invalidateTemplateSetsListCache();
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
    invalidateTemplateSetsListCache();
    return normalizeTemplate(JSON.parse(text) as Record<string, unknown>);
  }
  const raw = await apiJson<Record<string, unknown>>(`/api/templates/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  invalidateTemplateSetsListCache();
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
  invalidateTemplateSetsListCache();
  return normalizeTemplate(raw);
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await apiJson(`/api/templates/${id}/`, { method: "DELETE" });
  invalidateTemplateSetsListCache();
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
  invalidateTemplateSetsListCache();
  return normalizeSet(raw);
};
