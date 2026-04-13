import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { useDragAndDrop } from "../../hooks/useDragAndDrop";
import { newClientElementId } from "../../lib/elementId";
import type { Template, TemplateElement } from "../../types/mockup";
import { useAppStore } from "../../store/appStore";

type Viewport = { zoom: number; pan: { x: number; y: number } };

const ZOOM_MIN = 0.05;
const ZOOM_MAX = 8;
const WHEEL_LINE_PX = 16;
const WHEEL_SENSITIVITY = 0.00175;
const PINCH_DAMPING = 0.45;
const BUTTON_ZOOM_FACTOR = 1.12;

const normalizeWheelDeltaYPixels = (e: WheelEvent, pageRefHeight: number): number => {
  switch (e.deltaMode) {
    case WheelEvent.DOM_DELTA_LINE:
      return e.deltaY * WHEEL_LINE_PX;
    case WheelEvent.DOM_DELTA_PAGE:
      return e.deltaY * pageRefHeight;
    default:
      return e.deltaY;
  }
};

const applyZoomAtScreenPoint = (
  prevZoom: number,
  prevPan: { x: number; y: number },
  rawNewZoom: number,
  anchorX: number,
  anchorY: number,
): Viewport => {
  const nextZoom = Math.min(Math.max(ZOOM_MIN, rawNewZoom), ZOOM_MAX);
  const r = nextZoom / prevZoom;
  return {
    zoom: nextZoom,
    pan: {
      x: anchorX - (anchorX - prevPan.x) * r,
      y: anchorY - (anchorY - prevPan.y) * r,
    },
  };
};

type Point = { x: number; y: number; isSnappedX?: boolean; isSnappedY?: boolean };

type Props = {
  editingTemplate: Template;
  isSnapEnabled: boolean;
  setIsSnapEnabled: Dispatch<SetStateAction<boolean>>;
  isGuideSnapEnabled: boolean;
  setIsGuideSnapEnabled: Dispatch<SetStateAction<boolean>>;
  isDrawMode: boolean;
  setIsDrawMode: Dispatch<SetStateAction<boolean>>;
  drawPoints: Point[];
  setDrawPoints: Dispatch<SetStateAction<Point[]>>;
  cursorPoint: Point | null;
  setCursorPoint: Dispatch<SetStateAction<Point | null>>;
};

export const CanvasViewport = ({
  editingTemplate,
  isSnapEnabled,
  setIsSnapEnabled,
  isGuideSnapEnabled,
  setIsGuideSnapEnabled,
  isDrawMode,
  setIsDrawMode,
  drawPoints,
  setDrawPoints,
  cursorPoint,
  setCursorPoint,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRootRef = useRef<HTMLDivElement>(null);
  const lastPointerInContainerRef = useRef<{ x: number; y: number } | null>(null);
  const panRef = useRef({ startX: 0, startY: 0, initialPanX: 0, initialPanY: 0 });
  const [viewport, setViewport] = useState<Viewport>({ zoom: 1, pan: { x: 0, y: 0 } });
  const { zoom, pan } = viewport;
  const [isPanning, setIsPanning] = useState(false);

  const setSelectedElementId = useAppStore((s) => s.setSelectedElementId);
  const selectedElementId = useAppStore((s) => s.selectedElementId);
  const updateEditingTemplate = useAppStore((s) => s.updateEditingTemplate);

  const { snapGuides, onPointerDownElement } = useDragAndDrop({
    editingTemplate,
    updateEditingTemplate,
    setSelectedElementId,
    containerRef,
    zoom,
    pan,
    isSnapEnabled,
    isGuideSnapEnabled,
    isDrawMode,
  });

  const centerCanvas = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const scale = Math.min(
      (rect.width * 0.85) / editingTemplate.width,
      (rect.height * 0.85) / editingTemplate.height,
    );
    setViewport({
      zoom: scale,
      pan: {
        x: (rect.width - editingTemplate.width * scale) / 2,
        y: (rect.height - editingTemplate.height * scale) / 2,
      },
    });
  }, [editingTemplate.height, editingTemplate.width]);

  useEffect(() => {
    const t = setTimeout(centerCanvas, 50);
    return () => clearTimeout(t);
  }, [editingTemplate.id, centerCanvas]);

  useEffect(() => {
    const root = viewportRootRef.current;
    if (!root) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dy = normalizeWheelDeltaYPixels(e, rect.height);
      const damp = e.ctrlKey ? PINCH_DAMPING : 1;
      const factor = Math.exp(-dy * WHEEL_SENSITIVITY * damp);
      const mx = Math.min(rect.width, Math.max(0, e.clientX - rect.left));
      const my = Math.min(rect.height, Math.max(0, e.clientY - rect.top));
      setViewport((prev) => {
        const rawNext = prev.zoom * factor;
        return applyZoomAtScreenPoint(prev.zoom, prev.pan, rawNext, mx, my);
      });
    };
    root.addEventListener("wheel", handleWheel, { passive: false });
    return () => root.removeEventListener("wheel", handleWheel);
  }, [editingTemplate.id]);

  useEffect(() => {
    if (!isPanning) return;
    const handleMouseMove = (e: MouseEvent) => {
      setViewport((v) => ({
        ...v,
        pan: {
          x: panRef.current.initialPanX + (e.clientX - panRef.current.startX),
          y: panRef.current.initialPanY + (e.clientY - panRef.current.startY),
        },
      }));
    };
    const handleMouseUp = () => setIsPanning(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanning]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawMode) {
        setIsDrawMode(false);
        setDrawPoints([]);
        setCursorPoint(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawMode, setCursorPoint, setDrawPoints, setIsDrawMode]);

  const handleViewportPointerMove = (e: React.PointerEvent) => {
    const c = containerRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    lastPointerInContainerRef.current = {
      x: Math.min(r.width, Math.max(0, e.clientX - r.left)),
      y: Math.min(r.height, Math.max(0, e.clientY - r.top)),
    };
  };

  const handleViewportPointerLeave = () => {
    lastPointerInContainerRef.current = null;
  };

  const zoomByFactor = (direction: 1 | -1) => {
    setViewport((prev) => {
      const c = containerRef.current;
      if (!c) return prev;
      const rect = c.getBoundingClientRect();
      const refPt = lastPointerInContainerRef.current;
      const anchorX = refPt ? refPt.x : rect.width / 2;
      const anchorY = refPt ? refPt.y : rect.height / 2;
      const mult = direction > 0 ? BUTTON_ZOOM_FACTOR : 1 / BUTTON_ZOOM_FACTOR;
      return applyZoomAtScreenPoint(prev.zoom, prev.pan, prev.zoom * mult, anchorX, anchorY);
    });
  };

  const handleContainerPointerDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
      };
      return;
    }
    if (isDrawMode && e.button === 0) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      let ix = (e.clientX - rect.left - pan.x) / zoom;
      let iy = (e.clientY - rect.top - pan.y) / zoom;
      if (isSnapEnabled) {
        ix = Math.round(ix);
        iy = Math.round(iy);
      }
      const SNAP_DIST = 15 / zoom;
      if (drawPoints.length === 1 && Math.abs(iy - drawPoints[0].y) < SNAP_DIST) iy = drawPoints[0].y;
      if (drawPoints.length === 2 && Math.abs(ix - drawPoints[1].x) < SNAP_DIST) ix = drawPoints[1].x;
      if (drawPoints.length === 3) {
        if (Math.abs(iy - drawPoints[2].y) < SNAP_DIST) iy = drawPoints[2].y;
        if (Math.abs(ix - drawPoints[0].x) < SNAP_DIST) ix = drawPoints[0].x;
      }
      if (drawPoints.length === 3) {
        const newPoints = [...drawPoints, { x: ix, y: iy }];
        const minX = Math.min(...newPoints.map((p) => p.x));
        const maxX = Math.max(...newPoints.map((p) => p.x));
        const minY = Math.min(...newPoints.map((p) => p.y));
        const maxY = Math.max(...newPoints.map((p) => p.y));
        const newEl: TemplateElement = {
          id: newClientElementId(),
          type: "placeholder",
          name: "Gez. Motiv",
          x: Math.round(minX),
          y: Math.round(minY),
          w: Math.max(10, Math.round(maxX - minX)),
          h: Math.max(10, Math.round(maxY - minY)),
          rotation: 0,
          shadowEnabled: false,
          shadowColor: "rgba(0,0,0,0.5)",
          shadowBlur: 20,
          shadowOffsetX: 10,
          shadowOffsetY: 10,
          textCurve: 0,
        };
        updateEditingTemplate((prev) =>
          prev ? { ...prev, elements: [...prev.elements, newEl] } : prev,
        );
        setSelectedElementId(newEl.id);
        setIsDrawMode(false);
        setDrawPoints([]);
        setCursorPoint(null);
      } else {
        setDrawPoints([...drawPoints, { x: ix, y: iy }]);
      }
      return;
    }
    if (!isDrawMode && e.button === 0) {
      setIsPanning(true);
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
      };
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!isDrawMode) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    let ix = (e.clientX - rect.left - pan.x) / zoom;
    let iy = (e.clientY - rect.top - pan.y) / zoom;
    if (isSnapEnabled) {
      ix = Math.round(ix);
      iy = Math.round(iy);
    }
    const SNAP_DIST = 15 / zoom;
    let isSnappedX = false;
    let isSnappedY = false;
    if (drawPoints.length === 1) {
      if (Math.abs(iy - drawPoints[0].y) < SNAP_DIST) {
        iy = drawPoints[0].y;
        isSnappedY = true;
      }
    } else if (drawPoints.length === 2) {
      if (Math.abs(ix - drawPoints[1].x) < SNAP_DIST) {
        ix = drawPoints[1].x;
        isSnappedX = true;
      }
    } else if (drawPoints.length === 3) {
      if (Math.abs(iy - drawPoints[2].y) < SNAP_DIST) {
        iy = drawPoints[2].y;
        isSnappedY = true;
      }
      if (Math.abs(ix - drawPoints[0].x) < SNAP_DIST) {
        ix = drawPoints[0].x;
        isSnappedX = true;
      }
    }
    setCursorPoint({ x: ix, y: iy, isSnappedX, isSnappedY });
  };

  return (
    <div
      ref={viewportRootRef}
      onPointerMove={handleViewportPointerMove}
      onPointerLeave={handleViewportPointerLeave}
      className="relative flex h-full min-h-[500px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 lg:col-span-3"
    >
      {isDrawMode && (
        <div className="absolute top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-blue-700/50 bg-blue-900/95 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          <span>
            {drawPoints.length === 0 && "Klicke die 1. Ecke (z.B. Oben Links)"}
            {drawPoints.length === 1 && "Klicke die 2. Ecke (horizontal daneben)"}
            {drawPoints.length === 2 && "Klicke die 3. Ecke (vertikal darunter)"}
            {drawPoints.length === 3 && "Klicke die 4. Ecke zum Abschließen"}
          </span>
          <span className="ml-3 border-l border-blue-700/50 pl-3 text-xs text-blue-300">ESC = Abbruch</span>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-4 left-4 z-30 flex items-center justify-between rounded-lg border border-neutral-200 bg-white/90 p-1.5 shadow-md backdrop-blur">
        <div className="pointer-events-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => zoomByFactor(-1)}
            className="rounded p-1.5 text-neutral-600 hover:bg-neutral-100"
            title="Verkleinern"
          >
            −
          </button>
          <div className="w-10 text-center text-xs font-medium text-neutral-500">{Math.round(zoom * 100)}%</div>
          <button
            type="button"
            onClick={() => zoomByFactor(1)}
            className="rounded p-1.5 text-neutral-600 hover:bg-neutral-100"
            title="Vergrößern"
          >
            +
          </button>
          <div className="mx-1 h-4 w-px bg-neutral-300" />
          <button
            type="button"
            onClick={centerCanvas}
            className="rounded p-1.5 text-neutral-600 hover:bg-neutral-100"
            title="Einpassen"
          >
            ⧉
          </button>
          <div className="mx-1 h-4 w-px bg-neutral-300" />
          <button
            type="button"
            onClick={() => setIsSnapEnabled((v) => !v)}
            className={`rounded p-1.5 text-xs font-medium transition-colors ${
              isSnapEnabled ? "bg-blue-100 text-blue-700" : "text-neutral-500 hover:bg-neutral-100"
            }`}
            title={isSnapEnabled ? "Pixel-Snap an" : "Snap aus"}
          >
            Snap
          </button>
          <button
            type="button"
            onClick={() => setIsGuideSnapEnabled((v) => !v)}
            className={`rounded p-1.5 text-xs font-medium transition-colors ${
              isGuideSnapEnabled ? "bg-blue-100 text-blue-700" : "text-neutral-500 hover:bg-neutral-100"
            }`}
            title={isGuideSnapEnabled ? "Hilfslinien an" : "Hilfslinien aus"}
          >
            Guides
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        role="presentation"
        onMouseDown={handleContainerPointerDown}
        onMouseMove={handleContainerMouseMove}
        className={`checkerboard-bg relative flex-1 overflow-hidden ${
          isDrawMode ? "cursor-crosshair" : isPanning ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div
          className="absolute origin-top-left shadow-2xl"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: `${editingTemplate.width}px`,
            height: `${editingTemplate.height}px`,
          }}
        >
          <img
            src={editingTemplate.bgImage}
            alt="Hintergrund"
            className="pointer-events-none block h-full w-full"
            draggable={false}
            crossOrigin="anonymous"
          />

          {!isDrawMode && snapGuides.length > 0 && (
            <svg
              className="pointer-events-none absolute inset-0"
              style={{ width: "100%", height: "100%", overflow: "visible", zIndex: 10 }}
            >
              {snapGuides.map((guide, i) =>
                guide.type === "v" ? (
                  <line
                    key={`vg${i}`}
                    x1={guide.pos}
                    y1={-10000}
                    x2={guide.pos}
                    y2={10000}
                    stroke="#e91e63"
                    strokeWidth={1.5 / zoom}
                  />
                ) : (
                  <line
                    key={`hg${i}`}
                    x1={-10000}
                    y1={guide.pos}
                    x2={10000}
                    y2={guide.pos}
                    stroke="#e91e63"
                    strokeWidth={1.5 / zoom}
                  />
                ),
              )}
            </svg>
          )}

          {isDrawMode && (
            <svg
              className="pointer-events-none absolute inset-0"
              style={{ width: "100%", height: "100%", overflow: "visible", zIndex: 100 }}
            >
              {drawPoints.length > 1 && (
                <line
                  x1={drawPoints[0].x}
                  y1={drawPoints[0].y}
                  x2={drawPoints[1].x}
                  y2={drawPoints[1].y}
                  stroke="#22c55e"
                  strokeWidth={1 / zoom}
                  strokeDasharray={`${4 / zoom},${4 / zoom}`}
                />
              )}
              {drawPoints.length > 2 && (
                <line
                  x1={drawPoints[1].x}
                  y1={drawPoints[1].y}
                  x2={drawPoints[2].x}
                  y2={drawPoints[2].y}
                  stroke="#22c55e"
                  strokeWidth={1 / zoom}
                  strokeDasharray={`${4 / zoom},${4 / zoom}`}
                />
              )}
              {cursorPoint && (
                <>
                  {drawPoints.length === 1 && (
                    <line
                      x1={drawPoints[0].x}
                      y1={drawPoints[0].y}
                      x2={cursorPoint.x}
                      y2={cursorPoint.y}
                      stroke={cursorPoint.isSnappedY ? "#22c55e" : "#ef4444"}
                      strokeWidth={1 / zoom}
                      strokeDasharray={`${4 / zoom},${4 / zoom}`}
                    />
                  )}
                  {drawPoints.length === 2 && (
                    <line
                      x1={drawPoints[1].x}
                      y1={drawPoints[1].y}
                      x2={cursorPoint.x}
                      y2={cursorPoint.y}
                      stroke={cursorPoint.isSnappedX ? "#22c55e" : "#ef4444"}
                      strokeWidth={1 / zoom}
                      strokeDasharray={`${4 / zoom},${4 / zoom}`}
                    />
                  )}
                  {drawPoints.length === 3 && (
                    <>
                      <line
                        x1={drawPoints[2].x}
                        y1={drawPoints[2].y}
                        x2={cursorPoint.x}
                        y2={cursorPoint.y}
                        stroke={cursorPoint.isSnappedY ? "#22c55e" : "#ef4444"}
                        strokeWidth={1 / zoom}
                        strokeDasharray={`${4 / zoom},${4 / zoom}`}
                      />
                      <line
                        x1={cursorPoint.x}
                        y1={cursorPoint.y}
                        x2={drawPoints[0].x}
                        y2={drawPoints[0].y}
                        stroke={cursorPoint.isSnappedX ? "#22c55e" : "#ef4444"}
                        strokeWidth={1 / zoom}
                        strokeDasharray={`${4 / zoom},${4 / zoom}`}
                      />
                    </>
                  )}
                </>
              )}
              {drawPoints.map((p, i) => (
                <rect
                  key={`dp_${i}`}
                  x={p.x - 0.5}
                  y={p.y - 0.5}
                  width={1}
                  height={1}
                  fill="#3b82f6"
                  stroke="#fff"
                  strokeWidth={1 / zoom}
                />
              ))}
              {cursorPoint && (
                <rect
                  x={cursorPoint.x - 0.5}
                  y={cursorPoint.y - 0.5}
                  width={1}
                  height={1}
                  fill={cursorPoint.isSnappedX || cursorPoint.isSnappedY ? "#22c55e" : "#ef4444"}
                  stroke="#fff"
                  strokeWidth={1 / zoom}
                />
              )}
            </svg>
          )}

          {editingTemplate.elements.map((el) => {
            const isSelected = el.id === selectedElementId;
            const elStyle: CSSProperties = {
              left: `${(el.x / editingTemplate.width) * 100}%`,
              top: `${(el.y / editingTemplate.height) * 100}%`,
              width: `${(el.w / editingTemplate.width) * 100}%`,
              height: `${(el.h / editingTemplate.height) * 100}%`,
              transform: `rotate(${el.rotation ?? 0}deg)`,
              transformOrigin: "center center",
              filter: el.shadowEnabled
                ? `drop-shadow(${el.shadowOffsetX}px ${el.shadowOffsetY}px ${el.shadowBlur}px ${el.shadowColor})`
                : "none",
            };

            let content: ReactNode = null;
            if (el.type === "placeholder") {
              content = (
                <span
                  className={`text-lg font-bold drop-shadow-md ${isSelected ? "text-white" : "text-neutral-800"}`}
                >
                  {isSelected ? "Aktiv" : ""}
                </span>
              );
            } else if (el.type === "rect") {
              content = <div style={{ width: "100%", height: "100%", backgroundColor: el.color }} />;
            } else if (el.type === "circle") {
              content = (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: el.color,
                    borderRadius: "50%",
                  }}
                />
              );
            } else if (el.type === "triangle") {
              content = (
                <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <polygon points="50,0 100,100 0,100" fill={el.color} />
                </svg>
              );
            } else if (el.type === "star") {
              content = (
                <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <polygon
                    points="50,5 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35"
                    fill={el.color}
                  />
                </svg>
              );
            } else if (el.type === "hexagon") {
              content = (
                <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <polygon points="50,0 100,25 100,75 50,100 0,75 0,25" fill={el.color} />
                </svg>
              );
            } else if (el.type === "text") {
              const textStyle: CSSProperties = {
                color: el.color,
                fontSize: `${el.fontSize}px`,
                fontFamily: el.fontFamily,
                fontWeight: el.fontWeight as React.CSSProperties["fontWeight"],
                fontStyle: el.fontStyle as React.CSSProperties["fontStyle"],
                textAlign: el.textAlign as React.CSSProperties["textAlign"],
                lineHeight: "1.2",
                width: "100%",
                height: "100%",
                display: "block",
                wordBreak: "break-word",
                overflow: "hidden",
              };
              const curve = el.textCurve ?? 0;
              if (curve !== 0) {
                const chars = (el.text ?? "").split("");
                const anglePerChar = curve / Math.max(1, chars.length - 1);
                const radius = el.w / 2;
                content = (
                  <div
                    style={{
                      ...textStyle,
                      position: "relative",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {chars.map((char, i) => (
                      <span
                        key={`${el.id}-${i}`}
                        style={{
                          position: "absolute",
                          height: `${radius * 2}px`,
                          display: "flex",
                          alignItems: "flex-start",
                          transform: `rotate(${(i - (chars.length - 1) / 2) * anglePerChar}deg)`,
                        }}
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                );
              } else {
                content = <div style={textStyle}>{el.text}</div>;
              }
            }

            return (
              <div
                key={el.id}
                onMouseDown={(e) => onPointerDownElement(e, el.id, "move")}
                className={`absolute cursor-move transition-colors ${
                  el.type === "placeholder"
                    ? isSelected
                      ? "z-20 flex items-center justify-center border-2 border-blue-500 bg-blue-500/30"
                      : "z-10 flex items-center justify-center border-2 border-white/80 bg-white/40 hover:bg-blue-300/40"
                    : ""
                } ${isSelected && el.type !== "placeholder" ? "z-20 ring-2 ring-blue-500 ring-offset-1" : "z-10"} `}
                style={elStyle}
              >
                {content}
                {isSelected && (
                  <div
                    onMouseDown={(e) => onPointerDownElement(e, el.id, "rotate")}
                    className="absolute -top-10 left-1/2 z-30 flex h-5 w-5 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border-2 border-blue-600 bg-white shadow-md"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  </div>
                )}
                {isSelected && (
                  <>
                    {(["nw", "ne", "sw", "se", "n", "s", "e", "w"] as const).map((h) => (
                      <div
                        key={h}
                        onMouseDown={(e) => onPointerDownElement(e, el.id, "resize", h)}
                        className={`absolute z-20 border-white ${
                          h === "nw"
                            ? "-left-[2px] -top-[2px] h-6 w-6 cursor-nwse-resize border-l-[3px] border-t-[3px] border-dashed"
                            : h === "ne"
                              ? "-right-[2px] -top-[2px] h-6 w-6 cursor-nesw-resize border-r-[3px] border-t-[3px] border-dashed"
                              : h === "sw"
                                ? "-bottom-[2px] -left-[2px] h-6 w-6 cursor-nesw-resize border-b-[3px] border-l-[3px] border-dashed"
                                : h === "se"
                                  ? "-bottom-[2px] -right-[2px] h-6 w-6 cursor-nwse-resize border-b-[3px] border-r-[3px] border-dashed"
                                  : h === "n"
                                    ? "-top-[2px] left-1/2 h-4 w-8 -translate-x-1/2 cursor-ns-resize border-t-[3px] border-dashed"
                                    : h === "s"
                                      ? "-bottom-[2px] left-1/2 h-4 w-8 -translate-x-1/2 cursor-ns-resize border-b-[3px] border-dashed"
                                      : h === "e"
                                        ? "-right-[2px] top-1/2 h-8 w-4 -translate-y-1/2 cursor-ew-resize border-r-[3px] border-dashed"
                                        : "-left-[2px] top-1/2 h-8 w-4 -translate-y-1/2 cursor-ew-resize border-l-[3px] border-dashed"
                        } drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]`}
                      />
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
