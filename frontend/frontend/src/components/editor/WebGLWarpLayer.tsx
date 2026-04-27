import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  /** Immer aktuelle Slider/API-Werte — vermeidet stale closures mit useCallback([]). */
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const [supported, setSupported] = useState<boolean>(true);

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
    ],
  );

  const scheduleRender = useCallback(() => {
    pendingParamsRef.current = resolveWarpParams(paramsRef.current);
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
  }, []);

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
        const scale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(region.w, region.h));
        const dpr =
          typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
        const dstW = Math.max(8, Math.round(region.w * scale * dpr));
        const dstH = Math.max(8, Math.round(region.h * scale * dpr));
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
    // scheduleRender absichtlich nicht: sonst Bild-Neuladen bei jedem Falten-Parameter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgImageUrl, motifUrl, region.x, region.y, region.w, region.h, supported]);

  useEffect(() => {
    if (!supported) return;
    if (!rendererRef.current || !imagesRef.current) return;
    scheduleRender();
  }, [supported, scheduleRender, warpParamsKey]);

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
