import type { Template } from "../../types/mockup";
import { renderElementToCanvas } from "./renderElement";
import { getTemplateRenderOpts } from "./renderOpts";

type LoadImageFn = (src: string) => Promise<HTMLImageElement>;

/**
 * Rendert ein Template mit Artwork auf ein Canvas.
 * Gemeinsame Pipeline für GeneratorView (ZIP) und EtsyListingsEditor (PNG-Upload).
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
  for (const el of tpl.elements) {
    renderElementToCanvas(ctx, el, artworkImg, frameStyle, renderOpts);
  }

  return canvas;
};
