import type { QuadCornerPoint, TemplateElement } from "../../types/mockup";

/** TL, TR, BR, BL in Template-Pixelkoordinaten */
export type QuadCorners = [QuadCornerPoint, QuadCornerPoint, QuadCornerPoint, QuadCornerPoint];

export const isQuadPlaceholder = (el: TemplateElement): boolean =>
  el.type === "placeholder" &&
  el.placeholderShape === "quad" &&
  Array.isArray(el.quadCorners) &&
  el.quadCorners.length === 4;

export const quadAabb = (corners: QuadCorners): { minX: number; minY: number; maxX: number; maxY: number } => {
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
};

export const syncElementBoxFromQuad = (el: TemplateElement & { quadCorners: QuadCorners }): void => {
  const a = quadAabb(el.quadCorners);
  el.x = Math.round(a.minX);
  el.y = Math.round(a.minY);
  el.w = Math.max(1, Math.round(a.maxX - a.minX));
  el.h = Math.max(1, Math.round(a.maxY - a.minY));
};

export const defaultQuadCornersFromRect = (el: Pick<TemplateElement, "x" | "y" | "w" | "h">): QuadCorners => {
  const { x, y, w, h } = el;
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
};

/** Ganzzahlige Crop-Region für WebGL/BG (AABB der Quad-Ecken). */
export const quadCropRect = (
  corners: QuadCorners,
): { x: number; y: number; w: number; h: number } => {
  const a = quadAabb(corners);
  const x = Math.floor(a.minX);
  const y = Math.floor(a.minY);
  const w = Math.max(1, Math.ceil(a.maxX) - x);
  const h = Math.max(1, Math.ceil(a.maxY) - y);
  return { x, y, w, h };
};
