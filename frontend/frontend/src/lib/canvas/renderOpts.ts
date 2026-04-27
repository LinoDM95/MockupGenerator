import type { FrameStyle, Template } from "../../types/mockup";
import type { RenderElementOptions } from "./renderElement";

export type TemplateRenderOpts = RenderElementOptions & {
  frameStyle: FrameStyle;
};

export const getTemplateRenderOpts = (tpl: Template): TemplateRenderOpts => ({
  frameStyle: tpl.defaultFrameStyle ?? "none",
  frameShadowOuterEnabled: tpl.frameShadowOuterEnabled === true,
  frameShadowInnerEnabled: tpl.frameShadowInnerEnabled === true,
  frameOuterSides: tpl.frameOuterSides ?? 15,
  frameInnerSides: tpl.frameInnerSides ?? 15,
  frameShadowDepth: tpl.frameShadowDepth ?? 0.82,
  artworkSaturation: tpl.artworkSaturation ?? 1,
  foldsEnabled: tpl.foldsEnabled === true,
  foldStrength: tpl.foldStrength ?? 0.4,
  foldShadowDepth: tpl.foldShadowDepth ?? 0.6,
  foldHighlightStrength: tpl.foldHighlightStrength ?? 0.25,
  foldSmoothing: tpl.foldSmoothing ?? 4,
});
