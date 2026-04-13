import { renderElementToCanvas } from "../../lib/canvas/renderElement";
import type { Template } from "../../types/mockup";

type LoadImg = (src: string) => Promise<HTMLImageElement>;

/** PNG-Blob wie im Generator (Canvas-Pipeline), für Etsy-Upload. */
export const renderTemplateToPngBlob = async (
  tpl: Template,
  artworkUrl: string,
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
  const frameStyle = tpl.defaultFrameStyle ?? "none";
  const renderOpts = {
    frameShadowOuterEnabled: tpl.frameShadowOuterEnabled === true,
    frameShadowInnerEnabled: tpl.frameShadowInnerEnabled === true,
    frameOuterSides: tpl.frameOuterSides ?? 15,
    frameInnerSides: tpl.frameInnerSides ?? 15,
    frameShadowDepth: tpl.frameShadowDepth ?? 0.82,
    artworkSaturation: tpl.artworkSaturation ?? 1,
  };
  for (const el of tpl.elements) {
    renderElementToCanvas(ctx, el, artImg, frameStyle, renderOpts);
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
