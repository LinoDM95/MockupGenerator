import { memo, useEffect, useMemo, useRef, useState } from "react";

import { blitTextureToTemplateQuad } from "../../lib/canvas/perspectiveBlit";
import { quadCropRect, type QuadCorners } from "../../lib/canvas/placeholderGeometry";
import {
  isWebGLAvailable,
  resolveWarpParams,
  WebGLWarpRenderer,
  type WarpParams,
} from "../../lib/canvas/webglWarp";
import type { TemplateElement } from "../../types/mockup";

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Bild konnte nicht geladen werden: ${src}`));
    img.src = src;
  });

type Props = {
  /** Leer = keine Falten/Lighting aus dem Hintergrund; nur Motiv + Perspektive. */
  bgImageUrl: string;
  motifUrl: string;
  el: TemplateElement;
  params: Partial<WarpParams>;
};

/**
 * Live-Vorschau: Stoff-Warp im AABB-Crop + perspektivischer Blit auf Quad (wie Export).
 */
const PerspectiveWarpPreviewLayerInner = ({ bgImageUrl, motifUrl, el, params }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const [supported, setSupported] = useState(true);

  const warpParamsKey = useMemo(
    () =>
      [
        params.foldStrength ?? "",
        params.foldShadowDepth ?? "",
        params.foldHighlightStrength ?? "",
        params.foldSmoothing ?? "",
        params.artworkSaturation ?? "",
        params.sobelRadius ?? "",
        params.analysisDenoise ?? "",
        params.foldNoiseFloor ?? "",
        params.occlusionStrength ?? "",
      ].join("|"),
    [
      params.foldStrength,
      params.foldShadowDepth,
      params.foldHighlightStrength,
      params.foldSmoothing,
      params.artworkSaturation,
      params.sobelRadius,
      params.analysisDenoise,
      params.foldNoiseFloor,
      params.occlusionStrength,
    ],
  );

  useEffect(() => {
    if (!el.quadCorners || el.quadCorners.length !== 4) return;
    let cancelled = false;
    (async () => {
      try {
        const art = await loadImage(motifUrl);
        if (cancelled) return;
        const bgOk = bgImageUrl.trim().length > 0;
        const bg = bgOk ? await loadImage(bgImageUrl) : null;
        if (cancelled) return;
        const occUrl = el.occlusionMaskUrl?.trim();
        const occFeather = Math.max(0, Math.min(16, el.occlusionFeather ?? 2));
        const occ =
          occUrl && bgOk ? await loadImage(occUrl).catch(() => null) : null;
        const crop = quadCropRect(el.quadCorners as QuadCorners);
        const warpParams = resolveWarpParams(paramsRef.current);
        const useGl = isWebGLAvailable();
        let rectPass: HTMLCanvasElement | null = null;
        if (useGl && bg) {
          rectPass = WebGLWarpRenderer.renderOnce(
            bg,
            art,
            crop,
            warpParams,
            crop.w,
            crop.h,
            occ,
            occFeather,
          );
        }
        if (!rectPass) {
          const c = document.createElement("canvas");
          c.width = crop.w;
          c.height = crop.h;
          const cx = c.getContext("2d");
          if (cx) {
            const ca = crop.w / crop.h;
            const ia = art.width / art.height;
            let sx = 0;
            let sy = 0;
            let sw = art.width;
            let sh = art.height;
            if (ia > ca) {
              sw = art.height * ca;
              sx = (art.width - sw) / 2;
            } else {
              sh = art.width / ca;
              sy = (art.height - sh) / 2;
            }
            const sat = warpParams.artworkSaturation ?? 1;
            if (sat < 0.999) cx.filter = `saturate(${Math.round(sat * 100)}%)`;
            cx.drawImage(art, sx, sy, sw, sh, 0, 0, c.width, c.height);
            cx.filter = "none";
          }
          rectPass = c;
        }
        const projected = blitTextureToTemplateQuad(
          rectPass,
          el.quadCorners as QuadCorners,
          crop.x,
          crop.y,
          crop.w,
          crop.h,
        );
        const c = canvasRef.current;
        if (!c || !projected || cancelled) return;
        c.width = projected.width;
        c.height = projected.height;
        const ctx = c.getContext("2d");
        if (ctx) ctx.drawImage(projected, 0, 0);
      } catch (e) {
        console.warn("[PerspectiveWarpPreviewLayer]", e);
        setSupported(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    bgImageUrl,
    motifUrl,
    el.quadCorners,
    el.occlusionMaskUrl,
    el.occlusionFeather,
    el.x,
    el.y,
    el.w,
    el.h,
    warpParamsKey,
  ]);

  if (!supported) return null;
  const corners = el.quadCorners as QuadCorners;
  const crop = quadCropRect(corners);
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute z-[1]"
      style={{
        left: `${((crop.x - el.x) / el.w) * 100}%`,
        top: `${((crop.y - el.y) / el.h) * 100}%`,
        width: `${(crop.w / el.w) * 100}%`,
        height: `${(crop.h / el.h) * 100}%`,
      }}
      aria-hidden
    />
  );
};

export const PerspectiveWarpPreviewLayer = memo(PerspectiveWarpPreviewLayerInner);
