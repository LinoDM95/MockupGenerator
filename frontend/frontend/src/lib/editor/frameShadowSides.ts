/** Bitmaske Rahmen-Schatten pro Seite (Außen wie Innen). */
export const FRAME_SHADOW_TOP = 1;
export const FRAME_SHADOW_RIGHT = 2;
export const FRAME_SHADOW_BOTTOM = 4;
export const FRAME_SHADOW_LEFT = 8;
export const FRAME_SHADOW_ALL = 15;

export type FrameShadowSideId = "top" | "right" | "bottom" | "left";

export const FRAME_SHADOW_SIDE_ORDER: FrameShadowSideId[] = ["top", "right", "bottom", "left"];

const SIDE_TO_BIT: Record<FrameShadowSideId, number> = {
  top: FRAME_SHADOW_TOP,
  right: FRAME_SHADOW_RIGHT,
  bottom: FRAME_SHADOW_BOTTOM,
  left: FRAME_SHADOW_LEFT,
};

export const frameShadowBitForSide = (side: FrameShadowSideId): number => SIDE_TO_BIT[side];

export const toggleSideInMask = (mask: number, side: FrameShadowSideId): number => {
  const b = SIDE_TO_BIT[side];
  return (mask & b) !== 0 ? mask & ~b : mask | b;
};

export const parseSidesMask = (raw: unknown, fallback = FRAME_SHADOW_ALL): number => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(FRAME_SHADOW_ALL, Math.max(0, Math.round(n)));
};
