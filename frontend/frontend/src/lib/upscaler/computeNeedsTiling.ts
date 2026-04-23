import type { UpscaleTotalFactor } from "../../api/upscaler";
import { UPSCALE_MAX_OUTPUT_PIXELS } from "./upscaleMaxOutputPixels";

export type UpscalerTilingItemLike = {
  originalWidth?: number;
  originalHeight?: number;
};

export const computeNeedsTiling = (
  it: UpscalerTilingItemLike,
  factor: UpscaleTotalFactor,
): boolean => {
  const ow = it.originalWidth;
  const oh = it.originalHeight;
  if (!ow || !oh) return false;
  const tw = ow * factor;
  const th = oh * factor;
  return tw * th > UPSCALE_MAX_OUTPUT_PIXELS;
};
