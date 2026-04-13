import type { TemplateElement } from "../../types/mockup";

export type Guide = { type: "v" | "h"; pos: number };

export const collectSnapTargets = (
  canvasW: number,
  canvasH: number,
  elements: TemplateElement[],
  excludeId: string,
): { xs: number[]; ys: number[] } => {
  const targetXs = [0, canvasW / 2, canvasW];
  const targetYs = [0, canvasH / 2, canvasH];
  elements.forEach((otherEl) => {
    if (otherEl.id === excludeId) return;
    targetXs.push(otherEl.x, otherEl.x + otherEl.w / 2, otherEl.x + otherEl.w);
    targetYs.push(otherEl.y, otherEl.y + otherEl.h / 2, otherEl.y + otherEl.h);
  });
  return { xs: targetXs, ys: targetYs };
};

export const snapVal = (val: number, targets: number[], threshold: number): number | null => {
  let closest: number | null = null;
  let minDiff = threshold;
  targets.forEach((t) => {
    const d = Math.abs(val - t);
    if (d < minDiff) {
      minDiff = d;
      closest = t;
    }
  });
  return closest;
};
