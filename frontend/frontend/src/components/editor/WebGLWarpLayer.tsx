import { memo, useEffect, useRef, useState } from "react";

import {
  WebGLWarpRenderer,
  isWebGLAvailable,
  resolveWarpParams,
  type WarpParams,
} from "../../lib/canvas/webglWarp";

type Props = {
  bgImageUrl: string;
  motifUrl: string;
  /** Element-Region in Template-Pixelkoordinaten (= BG-Pixel). */
  region: { x: number; y: number; w: number; h: number };
  /** Output-Auflösung der Vorschau (idR Element-Größe). */
  params: Partial<WarpParams>;
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Bild konnte nicht geladen werden: ${src}`));
    img.src = src;
  });

const PREVIEW_MAX_EDGE = 1024;

/**
 * Live-Preview-Layer: rendert das User-Motiv mit Stoffverformung in das Element.
 * Re-rendert bei Slider-Änderungen mit rAF-Drosselung (60 FPS).
 */
const WebGLWarpLayerInner = ({ bgImageUrl, motifUrl, region, params }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLWarpRenderer | null>(null);
  const imagesRef = useRef<{ bg: HTMLImageElement; art: HTMLImageElement } | null>(null);
  const lastSourcesKeyRef = useRef<string>("");
  const rafRef = useRef(0);
  const pendingParamsRef = useRef<WarpParams | null>(null);
  const [supported, setSupported] = useState<boolean>(true);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setSupported(false);
      return;
    }
  }, []);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    const sourcesKey = `${bgImageUrl}|${motifUrl}|${region.x},${region.y},${region.w},${region.h}`;
    if (sourcesKey === lastSourcesKeyRef.current && rendererRef.current && imagesRef.current) {
      // Region/Quellen unverändert → nur erneut rendern
      scheduleRender();
      return;
    }
    (async () => {
      try {
        const [bg, art] = await Promise.all([loadImage(bgImageUrl), loadImage(motifUrl)]);
        if (cancelled) return;
        imagesRef.current = { bg, art };
        const c = canvasRef.current;
        if (!c) return;
        // Output-Größe auf max. Kantenlänge limitieren für FPS
        const scale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(region.w, region.h));
        const dstW = Math.max(8, Math.round(region.w * scale));
        const dstH = Math.max(8, Math.round(region.h * scale));
        if (!rendererRef.current) {
          rendererRef.current = new WebGLWarpRenderer(c);
        }
        rendererRef.current.setSources(bg, art, region, dstW, dstH);
        lastSourcesKeyRef.current = sourcesKey;
        scheduleRender();
      } catch (err) {
        console.warn("[WebGLWarpLayer] load failed:", err);
        setSupported(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgImageUrl, motifUrl, region.x, region.y, region.w, region.h, supported]);

  const scheduleRender = () => {
    pendingParamsRef.current = resolveWarpParams(params);
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const r = rendererRef.current;
      const p = pendingParamsRef.current;
      if (r && p) {
        try {
          r.render(p);
        } catch (err) {
          console.warn("[WebGLWarpLayer] render failed:", err);
        }
      }
    });
  };

  // Re-render bei Param-Änderungen
  useEffect(() => {
    if (!supported) return;
    if (!rendererRef.current || !imagesRef.current) return;
    scheduleRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.foldStrength,
    params.foldShadowDepth,
    params.foldHighlightStrength,
    params.foldSmoothing,
    params.artworkSaturation,
    supported,
  ]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  if (!supported) {
    // Fallback: einfaches Bild ohne Warp
    return (
      <img
        src={motifUrl}
        alt=""
        className="absolute inset-0 z-[1] h-full w-full object-cover"
        draggable={false}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
      style={{ width: "100%", height: "100%", display: "block" }}
      aria-hidden
    />
  );
};

export const WebGLWarpLayer = memo(WebGLWarpLayerInner);
