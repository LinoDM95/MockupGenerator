import { canvasToBlob } from "../../lib/canvas/image";
import { renderTemplateToCanvas } from "../../lib/canvas/renderTemplate";
import type { Template } from "../../types/mockup";

type LoadImg = (src: string) => Promise<HTMLImageElement>;

/** PNG-Blob wie im Generator (Canvas-Pipeline), für Etsy-Upload. */
export const renderTemplateToPngBlob = async (
  tpl: Template,
  artworkUrl: string,
  loadImage: LoadImg,
): Promise<Blob> => {
  const artImg = await loadImage(artworkUrl);
  const canvas = await renderTemplateToCanvas(tpl, artImg, loadImage);
  return canvasToBlob(canvas, "image/png");
};
