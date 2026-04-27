import type { Template } from "../../types/mockup";
import { renderElementToCanvas } from "./renderElement";
import { getTemplateRenderOpts } from "./renderOpts";

type LoadImageFn = (src: string) => Promise<HTMLImageElement>;

/**
 * Rendert ein Template mit Artwork auf ein Canvas.
 * Gemeinsame Pipeline für generator/GeneratorView (ZIP) und EtsyListingsEditor (PNG-Upload).
 */
export const renderTemplateToCanvas = async (
  tpl: Template,
  artworkImg: HTMLImageElement,
  loadImageFn: LoadImageFn,
): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement("canvas");
  canvas.width = tpl.width;
  canvas.height = tpl.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kein Canvas-2D-Kontext.");

  if (!tpl.bgImage?.trim()) {
    throw new Error(
      "Diese Vorlage hat kein Hintergrundbild — bitte im Vorlagen-Editor ein Mockup-Bild setzen.",
    );
  }

  const bgImg = await loadImageFn(tpl.bgImage);
  ctx.drawImage(bgImg, 0, 0, tpl.width, tpl.height);

  const { frameStyle, ...renderOpts } = getTemplateRenderOpts(tpl);
  // BG-Image als separates Argument (kein Teil von Template/RenderElementOptions),
  // weil Template.bgImage als URL-String typisiert ist.
  for (const el of tpl.elements) {
    let occlusionMask: HTMLImageElement | undefined;
    if (el.type === "placeholder" && el.occlusionMaskUrl?.trim()) {
      try {
        occlusionMask = await loadImageFn(el.occlusionMaskUrl);
      } catch {
        occlusionMask = undefined;
      }
    }
    renderElementToCanvas(ctx, el, artworkImg, frameStyle, {
      ...renderOpts,
      occlusionMask: occlusionMask ?? null,
    }, bgImg);
  }

  return canvas;
};
