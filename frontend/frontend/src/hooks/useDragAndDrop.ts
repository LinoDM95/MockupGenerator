import type { RefObject } from "react";
import { useCallback, useEffect, useState } from "react";

import { collectSnapTargets, snapVal, type Guide } from "../lib/guides/snap";
import type { Template, TemplateElement } from "../types/mockup";

export type DragAction = {
  actionType: "move" | "resize" | "rotate";
  id: string;
  handle: string | null;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  origRot: number;
  scaleFactor: number;
};

type Params = {
  editingTemplate: Template | null;
  updateEditingTemplate: (fn: (prev: Template | null) => Template | null) => void;
  setSelectedElementId: (id: string | null) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  pan: { x: number; y: number };
  isSnapEnabled: boolean;
  isGuideSnapEnabled: boolean;
  isDrawMode: boolean;
};

export const useDragAndDrop = ({
  editingTemplate,
  updateEditingTemplate,
  setSelectedElementId,
  containerRef,
  zoom,
  pan,
  isSnapEnabled,
  isGuideSnapEnabled,
  isDrawMode,
}: Params) => {
  const [dragAction, setDragAction] = useState<DragAction | null>(null);
  const [snapGuides, setSnapGuides] = useState<Guide[]>([]);

  const onPointerDownElement = useCallback(
    (
      e: React.MouseEvent,
      elId: string,
      actionType: DragAction["actionType"],
      handle: string | null = null,
    ) => {
      if (e.button === 1 || isDrawMode || !editingTemplate) return;
      e.preventDefault();
      e.stopPropagation();
      setSelectedElementId(elId);
      const el = editingTemplate.elements.find((x) => x.id === elId);
      if (!el) return;
      setDragAction({
        actionType,
        id: elId,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        origX: el.x,
        origY: el.y,
        origW: el.w,
        origH: el.h,
        origRot: el.rotation ?? 0,
        scaleFactor: 1 / zoom,
      });
    },
    [editingTemplate, isDrawMode, setSelectedElementId, zoom],
  );

  useEffect(() => {
    if (!dragAction || !editingTemplate) return;

    const handleMouseMove = (e: MouseEvent) => {
      let activeGuides: Guide[] = [];

      updateEditingTemplate((prev) => {
        if (!prev) return prev;
        const threshold = 12 / zoom;
        const { xs: targetXs, ys: targetYs } =
          isGuideSnapEnabled && !dragAction.actionType.includes("rotate")
            ? collectSnapTargets(prev.width, prev.height, prev.elements, dragAction.id)
            : { xs: [] as number[], ys: [] as number[] };

        const newElements = prev.elements.map((el) => {
          if (el.id !== dragAction.id) return el;
          const dx = (e.clientX - dragAction.startX) * dragAction.scaleFactor;
          const dy = (e.clientY - dragAction.startY) * dragAction.scaleFactor;
          const newEl: TemplateElement = { ...el };

          const snap = (val: number) => (isSnapEnabled ? Math.round(val) : val);

          if (isGuideSnapEnabled && !dragAction.actionType.includes("rotate")) {
            if (dragAction.actionType === "move") {
              let targetX = dragAction.origX + dx;
              let cX = snapVal(targetX + newEl.w / 2, targetXs, threshold);
              let lX = snapVal(targetX, targetXs, threshold);
              let rX = snapVal(targetX + newEl.w, targetXs, threshold);

              if (cX !== null) {
                newEl.x = snap(cX - newEl.w / 2);
                activeGuides.push({ type: "v", pos: cX });
              } else if (lX !== null) {
                newEl.x = snap(lX);
                activeGuides.push({ type: "v", pos: lX });
              } else if (rX !== null) {
                newEl.x = snap(rX - newEl.w);
                activeGuides.push({ type: "v", pos: rX });
              } else {
                newEl.x = snap(targetX);
              }

              let targetY = dragAction.origY + dy;
              let cY = snapVal(targetY + newEl.h / 2, targetYs, threshold);
              let tY = snapVal(targetY, targetYs, threshold);
              let bY = snapVal(targetY + newEl.h, targetYs, threshold);

              if (cY !== null) {
                newEl.y = snap(cY - newEl.h / 2);
                activeGuides.push({ type: "h", pos: cY });
              } else if (tY !== null) {
                newEl.y = snap(tY);
                activeGuides.push({ type: "h", pos: tY });
              } else if (bY !== null) {
                newEl.y = snap(bY - newEl.h);
                activeGuides.push({ type: "h", pos: bY });
              } else {
                newEl.y = snap(targetY);
              }
            } else if (dragAction.actionType === "resize" && dragAction.handle) {
              let tW = Math.max(
                1,
                dragAction.origW +
                  (dragAction.handle.includes("e") ? dx : dragAction.handle.includes("w") ? -dx : 0),
              );
              let tH = Math.max(
                1,
                dragAction.origH +
                  (dragAction.handle.includes("s") ? dy : dragAction.handle.includes("n") ? -dy : 0),
              );
              let tX = dragAction.origX + (dragAction.handle.includes("w") ? dx : 0);
              let tY = dragAction.origY + (dragAction.handle.includes("n") ? dy : 0);

              if (dragAction.handle.includes("e")) {
                const rX = snapVal(tX + tW, targetXs, threshold);
                if (rX !== null) {
                  tW = Math.max(1, rX - tX);
                  activeGuides.push({ type: "v", pos: rX });
                }
              }
              if (dragAction.handle.includes("w")) {
                const lX = snapVal(tX, targetXs, threshold);
                if (lX !== null && dragAction.origW - (lX - dragAction.origX) >= 1) {
                  tX = lX;
                  tW = dragAction.origW - (lX - dragAction.origX);
                  activeGuides.push({ type: "v", pos: lX });
                }
              }
              if (dragAction.handle.includes("s")) {
                const bY = snapVal(tY + tH, targetYs, threshold);
                if (bY !== null) {
                  tH = Math.max(1, bY - tY);
                  activeGuides.push({ type: "h", pos: bY });
                }
              }
              if (dragAction.handle.includes("n")) {
                const tYsnap = snapVal(tY, targetYs, threshold);
                if (tYsnap !== null && dragAction.origH - (tYsnap - dragAction.origY) >= 1) {
                  tY = tYsnap;
                  tH = dragAction.origH - (tYsnap - dragAction.origY);
                  activeGuides.push({ type: "h", pos: tYsnap });
                }
              }
              newEl.x = snap(tX);
              newEl.y = snap(tY);
              newEl.w = snap(tW);
              newEl.h = snap(tH);
            }
          } else {
            if (dragAction.actionType === "move") {
              newEl.x = snap(dragAction.origX + dx);
              newEl.y = snap(dragAction.origY + dy);
            } else if (dragAction.actionType === "resize" && dragAction.handle) {
              if (dragAction.handle.includes("e")) newEl.w = Math.max(1, snap(dragAction.origW + dx));
              if (dragAction.handle.includes("s")) newEl.h = Math.max(1, snap(dragAction.origH + dy));
              if (dragAction.handle.includes("w")) {
                const desiredX = snap(dragAction.origX + dx);
                const actualDx = desiredX - dragAction.origX;
                if (dragAction.origW - actualDx >= 1) {
                  newEl.x = desiredX;
                  newEl.w = snap(dragAction.origW - actualDx);
                }
              }
              if (dragAction.handle.includes("n")) {
                const desiredY = snap(dragAction.origY + dy);
                const actualDy = desiredY - dragAction.origY;
                if (dragAction.origH - actualDy >= 1) {
                  newEl.y = desiredY;
                  newEl.h = snap(dragAction.origH - actualDy);
                }
              }
            }
          }

          if (dragAction.actionType === "rotate" && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const elCx = dragAction.origX + dragAction.origW / 2;
            const elCy = dragAction.origY + dragAction.origH / 2;
            const screenCx = rect.left + elCx * zoom + pan.x;
            const screenCy = rect.top + elCy * zoom + pan.y;
            const angle = (Math.atan2(e.clientY - screenCy, e.clientX - screenCx) * 180) / Math.PI;
            let newRot = angle + 90;
            if (isSnapEnabled) newRot = Math.round(newRot / 15) * 15;
            newEl.rotation = snap(newRot);
          }
          return newEl;
        });
        return { ...prev, elements: newElements };
      });
      setSnapGuides(activeGuides);
    };

    const handleMouseUp = () => {
      setDragAction(null);
      setSnapGuides([]);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragAction, isSnapEnabled, isGuideSnapEnabled, zoom, pan, updateEditingTemplate, containerRef]);

  return { dragAction, snapGuides, onPointerDownElement, setDragAction };
};
