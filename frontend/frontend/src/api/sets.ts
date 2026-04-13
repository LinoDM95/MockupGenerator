import type { Template, TemplateElement, TemplateSet } from "../types/mockup";

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
export const normalizeTemplate = (raw: Record<string, unknown>): Template => ({
  id: String(raw.id),
  name: String(raw.name ?? ""),
  width: Number(raw.width),
  height: Number(raw.height),
  bgImage: mediaUrlForBrowser(String(raw.bgImage ?? "")),
  order: raw.order !== undefined ? Number(raw.order) : undefined,
  elements: Array.isArray(raw.elements)
    ? (raw.elements as Record<string, unknown>[]).map(normalizeElement)
    : [],
});

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
  const res = await apiFetch(`/api/sets/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
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
  const res = await apiFetch(`/api/templates/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
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
