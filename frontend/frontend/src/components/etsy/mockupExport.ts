import { renderElementToCanvas } from "../../lib/canvas/renderElement";
import type { FrameStyle, Template } from "../../types/mockup";

type LoadImg = (src: string) => Promise<HTMLImageElement>;

/** PNG-Blob wie im Generator (Canvas-Pipeline), für Etsy-Upload. */
export const renderTemplateToPngBlob = async (
  tpl: Template,
  artworkUrl: string,
  frameStyle: FrameStyle,
  loadImage: LoadImg,
): Promise<Blob> => {
  const artImg = await loadImage(artworkUrl);
  const bgImg = await loadImage(tpl.bgImage);
  const canvas = document.createElement("canvas");
  canvas.width = tpl.width;
  canvas.height = tpl.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kein Canvas-2D-Kontext.");
  ctx.drawImage(bgImg, 0, 0, tpl.width, tpl.height);
  for (const el of tpl.elements) {
    renderElementToCanvas(ctx, el, artImg, frameStyle);
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("toBlob fehlgeschlagen"));
      },
      "image/png",
      1,
    );
  });
};
