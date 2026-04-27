import { useCallback, useLayoutEffect, useRef } from "react";

import { loadImage } from "../../lib/canvas/image";

export type OcclusionPaintTool = "brush" | "eraser";

type Props = {
  active: boolean;
  /** Wechsel startet neue Session (lädt `initialMaskUrl` einmalig). */
  sessionKey: string;
  templateW: number;
  templateH: number;
  /** Maske beim Start dieser Session (kann leer sein). */
  initialMaskUrl?: string;
  brushPx: number;
  tool: OcclusionPaintTool;
  onCommitBlobUrl: (url: string) => void;
};

/**
 * Vollflächige Occlusion-Maske in Mockup-Pixeln (weiß = Motiv ausblenden).
 * Zeigt eine rötliche Vorschau; exportiert Graustufen-PNG.
 */
export const OcclusionMaskPaintLayer = ({
  active,
  sessionKey,
  templateW,
  templateH,
  brushPx,
  tool,
  initialMaskUrl,
  onCommitBlobUrl,
}: Props) => {
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const displayRef = useRef<HTMLCanvasElement | null>(null);
  const loadedSessionRef = useRef<string | null>(null);
  const loadTokenRef = useRef(0);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  const ensureOffscreen = useCallback(() => {
    let c = offscreenRef.current;
    if (!c) {
      c = document.createElement("canvas");
      offscreenRef.current = c;
    }
    const w = Math.max(1, Math.round(templateW));
    const h = Math.max(1, Math.round(templateH));
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    return c;
  }, [templateH, templateW]);

  const refreshDisplay = useCallback(() => {
    const off = offscreenRef.current;
    const disp = displayRef.current;
    if (!off || !disp) return;
    const ctx = disp.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, disp.width, disp.height);
    ctx.drawImage(off, 0, 0);
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = "rgba(239, 68, 68, 0.42)";
    ctx.fillRect(0, 0, disp.width, disp.height);
    ctx.globalCompositeOperation = "source-over";
  }, []);

  const commit = useCallback(() => {
    const off = offscreenRef.current;
    if (!off) return;
    void new Promise<Blob | null>((resolve) => off.toBlob((b) => resolve(b), "image/png")).then((blob) => {
      if (!blob) return;
      onCommitBlobUrl(URL.createObjectURL(blob));
    });
  }, [onCommitBlobUrl]);

  useLayoutEffect(() => {
    if (!active) {
      loadedSessionRef.current = null;
      return;
    }
    if (loadedSessionRef.current === sessionKey) return;
    loadedSessionRef.current = sessionKey;
    const gen = ++loadTokenRef.current;

    const off = ensureOffscreen();
    const octx = off.getContext("2d");
    if (!octx) return;
    octx.fillStyle = "#000000";
    octx.fillRect(0, 0, off.width, off.height);

    const url = initialMaskUrl?.trim();
    if (url) {
      void loadImage(url)
        .then((img) => {
          if (loadTokenRef.current !== gen) return;
          octx.drawImage(img, 0, 0, off.width, off.height);
          refreshDisplay();
        })
        .catch(() => {
          if (loadTokenRef.current !== gen) return;
          refreshDisplay();
        });
    } else {
      refreshDisplay();
    }
  }, [active, ensureOffscreen, initialMaskUrl, refreshDisplay, sessionKey]);

  useLayoutEffect(() => {
    const disp = displayRef.current;
    if (!disp || !active) return;
    const w = Math.max(1, Math.round(templateW));
    const h = Math.max(1, Math.round(templateH));
    disp.width = w;
    disp.height = h;
    refreshDisplay();
  }, [active, refreshDisplay, templateH, templateW]);

  const toTemplatePoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * templateW;
    const y = ((e.clientY - rect.top) / rect.height) * templateH;
    return { x, y };
  };

  const strokeLine = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const off = offscreenRef.current;
    if (!off) return;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    const lw = Math.max(1, brushPx);
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "brush") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#ffffff";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#000000";
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const paintDot = (p: { x: number; y: number }) => {
    const off = offscreenRef.current;
    if (!off) return;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    const r = Math.max(0.5, brushPx / 2);
    ctx.globalCompositeOperation = "source-over";
    if (tool === "brush") {
      ctx.fillStyle = "#ffffff";
    } else {
      ctx.fillStyle = "#000000";
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const p = toTemplatePoint(e);
    lastRef.current = p;
    paintDot(p);
    refreshDisplay();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active || !drawingRef.current || e.buttons !== 1) return;
    e.preventDefault();
    e.stopPropagation();
    const p = toTemplatePoint(e);
    const last = lastRef.current;
    if (last) strokeLine(last, p);
    lastRef.current = p;
    refreshDisplay();
  };

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    drawingRef.current = false;
    lastRef.current = null;
    commit();
  };

  if (!active) return null;

  return (
    <canvas
      ref={displayRef}
      className="absolute inset-0 z-[150] touch-none"
      style={{ width: "100%", height: "100%" }}
      aria-label="Occlusion-Maske malen"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
    />
  );
};
