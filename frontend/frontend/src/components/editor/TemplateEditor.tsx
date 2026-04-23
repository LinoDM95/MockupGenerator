import { ArrowLeft, ImageUp, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { patchTemplate, replaceTemplateElements } from "../../api/sets";
import { compressImage, dataUrlToBlob, loadImage } from "../../lib/canvas/image";
import {
  createPreviewMotifDataUrl,
  PREVIEW_MOTIF_VARIANT_COUNT,
  previewVariantSwatchStyle,
} from "../../lib/editor/previewSampleMotif";
import { newClientElementId } from "../../lib/editor/elementId";
import {
  FRAME_SHADOW_ALL,
  FRAME_SHADOW_SIDE_ORDER,
  type FrameShadowSideId,
  frameShadowBitForSide,
  toggleSideInMask,
} from "../../lib/editor/frameShadowSides";
import { toast } from "../../lib/ui/toast";
import { cn } from "../../lib/ui/cn";
import {
  WORKSPACE_PANEL_HEADER,
  WORKSPACE_PANEL_TITLE,
  WORKSPACE_ZINC_MUTED,
  workspacePanelCardClassName,
} from "../../lib/ui/workspaceSurfaces";
import type { ElementType, FrameStyle, TemplateElement } from "../../types/mockup";
import { useAppStore } from "../../store/appStore";
import { Button } from "../ui/primitives/Button";
import { Input } from "../ui/primitives/Input";
import { WorkspacePanelCard } from "../ui/layout/WorkspacePanelCard";
import { LinearLoadingBar } from "../ui/overlay/LinearLoadingBar";
import { Select } from "../ui/primitives/Select";
import { CanvasViewport } from "./CanvasViewport";
import { LayerManager } from "./LayerManager";
import { PropertiesPanel } from "./PropertiesPanel";
import { Toolbar } from "./Toolbar";

type Props = {
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

const FRAME_SHADOW_SIDE_LABEL: Record<FrameShadowSideId, string> = {
  top: "Oben",
  right: "Rechts",
  bottom: "Unten",
  left: "Links",
};

const scaleElementsForCanvas = (
  elements: TemplateElement[],
  oldW: number,
  oldH: number,
  newW: number,
  newH: number,
): TemplateElement[] => {
  if (oldW <= 0 || oldH <= 0) return elements;
  const sx = newW / oldW;
  const sy = newH / oldH;
  const sFont = Math.min(sx, sy);
  return elements.map((el) => {
    const scaled: TemplateElement = {
      ...el,
      x: Math.round(el.x * sx),
      y: Math.round(el.y * sy),
      w: Math.round(el.w * sx),
      h: Math.round(el.h * sy),
    };
    if (el.type === "text" && el.fontSize != null) {
      scaled.fontSize = Math.max(8, Math.round(el.fontSize * sFont));
    }
    if (el.shadowBlur != null) {
      scaled.shadowBlur = Math.max(0, Math.round(el.shadowBlur * sFont));
    }
    if (el.shadowOffsetX != null) {
      scaled.shadowOffsetX = Math.round(el.shadowOffsetX * sx);
    }
    if (el.shadowOffsetY != null) {
      scaled.shadowOffsetY = Math.round(el.shadowOffsetY * sy);
    }
    return scaled;
  });
};

export const TemplateEditor = ({ onClose, onSaved }: Props) => {
  const editingTemplate = useAppStore((s) => s.editingTemplate);
  const setEditingTemplate = useAppStore((s) => s.setEditingTemplate);
  const selectedElementId = useAppStore((s) => s.selectedElementId);
  const setSelectedElementId = useAppStore((s) => s.setSelectedElementId);
  const updateEditingTemplate = useAppStore((s) => s.updateEditingTemplate);
  const openConfirm = useAppStore((s) => s.openConfirm);

  const [isSnapEnabled, setIsSnapEnabled] = useState(true);
  const [isGuideSnapEnabled, setIsGuideSnapEnabled] = useState(true);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [drawPoints, setDrawPoints] = useState<{ x: number; y: number }[]>([]);
  const [cursorPoint, setCursorPoint] = useState<{
    x: number;
    y: number;
    isSnappedX?: boolean;
    isSnappedY?: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [replacingBg, setReplacingBg] = useState(false);
  const [previewEndView, setPreviewEndView] = useState(false);
  const [previewMotifVariant, setPreviewMotifVariant] = useState(0);
  /** Rechte Spalte: wie Generator (Listing / Vorlage / Export) — Mockup, Ebenen, Eigenschaften */
  const [rightTab, setRightTab] = useState<0 | 1 | 2>(0);
  const previewMotifUrls = useMemo(
    () =>
      Array.from({ length: PREVIEW_MOTIF_VARIANT_COUNT }, (_, i) => createPreviewMotifDataUrl(i)),
    [],
  );
  const previewMotifUrl = previewMotifUrls[previewMotifVariant] ?? "";

  useEffect(() => {
    if (!previewEndView) return;
    setSelectedElementId(null);
    setIsDrawMode(false);
    setDrawPoints([]);
    setCursorPoint(null);
  }, [previewEndView, setSelectedElementId]);

  useEffect(() => {
    if (previewEndView) setRightTab(0);
  }, [previewEndView]);

  if (!editingTemplate) return null;

  const outerSidesMask = editingTemplate.frameOuterSides ?? FRAME_SHADOW_ALL;
  const innerSidesMask = editingTemplate.frameInnerSides ?? FRAME_SHADOW_ALL;
  const frameShadowOuterOn = editingTemplate.frameShadowOuterEnabled === true;
  const frameShadowInnerOn = editingTemplate.frameShadowInnerEnabled === true;
  const anyFrameShadowOn = frameShadowOuterOn || frameShadowInnerOn;

  const handleToggleFrameShadowOuter = () => {
    updateEditingTemplate((prev) => {
      if (!prev) return prev;
      const next = !(prev.frameShadowOuterEnabled === true);
      let sides = prev.frameOuterSides ?? FRAME_SHADOW_ALL;
      if (next && sides === 0) sides = FRAME_SHADOW_ALL;
      return { ...prev, frameShadowOuterEnabled: next, frameOuterSides: sides };
    });
  };

  const handleToggleFrameShadowInner = () => {
    updateEditingTemplate((prev) => {
      if (!prev) return prev;
      const next = !(prev.frameShadowInnerEnabled === true);
      let sides = prev.frameInnerSides ?? FRAME_SHADOW_ALL;
      if (next && sides === 0) sides = FRAME_SHADOW_ALL;
      return { ...prev, frameShadowInnerEnabled: next, frameInnerSides: sides };
    });
  };

  const handleToggleOuterSide = (side: FrameShadowSideId) => {
    updateEditingTemplate((prev) => {
      if (!prev) return prev;
      const cur = prev.frameOuterSides ?? FRAME_SHADOW_ALL;
      return { ...prev, frameOuterSides: toggleSideInMask(cur, side) };
    });
  };

  const handleToggleInnerSide = (side: FrameShadowSideId) => {
    updateEditingTemplate((prev) => {
      if (!prev) return prev;
      const cur = prev.frameInnerSides ?? FRAME_SHADOW_ALL;
      return { ...prev, frameInnerSides: toggleSideInMask(cur, side) };
    });
  };

  const handleOuterSidesAll = () => {
    updateEditingTemplate((prev) => {
      if (!prev) return prev;
      const cur = prev.frameOuterSides ?? FRAME_SHADOW_ALL;
      return { ...prev, frameOuterSides: cur === FRAME_SHADOW_ALL ? 0 : FRAME_SHADOW_ALL };
    });
  };

  const handleInnerSidesAll = () => {
    updateEditingTemplate((prev) => {
      if (!prev) return prev;
      const cur = prev.frameInnerSides ?? FRAME_SHADOW_ALL;
      return { ...prev, frameInnerSides: cur === FRAME_SHADOW_ALL ? 0 : FRAME_SHADOW_ALL };
    });
  };

  const activeEl = editingTemplate.elements.find((e) => e.id === selectedElementId) ?? null;

  const updateActiveElement = (key: keyof TemplateElement, value: string | number | boolean) => {
    if (!selectedElementId) return;
    updateEditingTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        elements: prev.elements.map((el) =>
          el.id === selectedElementId ? { ...el, [key]: value } : el,
        ),
      };
    });
  };

  const addElement = (type: ElementType) => {
    let newEl: TemplateElement = {
      id: newClientElementId(),
      type,
      x: Math.round(editingTemplate.width * 0.1),
      y: Math.round(editingTemplate.height * 0.1),
      rotation: 0,
      shadowEnabled: false,
      shadowColor: "rgba(0,0,0,0.5)",
      shadowBlur: 20,
      shadowOffsetX: 10,
      shadowOffsetY: 10,
      textCurve: 0,
      w: 100,
      h: 100,
    };
    if (type === "placeholder") newEl = { ...newEl, name: "Platzhalter", w: 400, h: 500 };
    else if (type === "text")
      newEl = {
        ...newEl,
        name: "Text",
        text: "Neuer Text\nZweite Zeile",
        fontSize: 60,
        fontFamily: "Arial",
        color: "#1c1917",
        fontWeight: "bold",
        fontStyle: "normal",
        textAlign: "center",
        w: 600,
        h: 200,
      };
    else if (["rect", "circle", "triangle", "star", "hexagon"].includes(type)) {
      newEl = {
        ...newEl,
        name: type.charAt(0).toUpperCase() + type.slice(1),
        w: 300,
        h: 300,
        color: "#e5e7eb",
      };
    }
    updateEditingTemplate((prev) =>
      prev ? { ...prev, elements: [...prev.elements, newEl] } : prev,
    );
    setSelectedElementId(newEl.id);
  };

  const duplicateElement = (elId: string) => {
    const el = editingTemplate.elements.find((e) => e.id === elId);
    if (!el) return;
    const newEl = { ...el, id: newClientElementId(), x: el.x + 50, y: el.y + 50 };
    updateEditingTemplate((prev) =>
      prev ? { ...prev, elements: [...prev.elements, newEl] } : prev,
    );
    setSelectedElementId(newEl.id);
  };

  const deleteElement = (elId: string) => {
    updateEditingTemplate((prev) => {
      if (!prev) return prev;
      const filtered = prev.elements.filter((e) => e.id !== elId);
      if (selectedElementId === elId) {
        setSelectedElementId(filtered.length ? filtered[filtered.length - 1].id : null);
      }
      return { ...prev, elements: filtered };
    });
  };

  const moveElement = (elId: string, direction: "up" | "down") => {
    updateEditingTemplate((prev) => {
      if (!prev) return prev;
      const idx = prev.elements.findIndex((e) => e.id === elId);
      if (idx < 0) return prev;
      if (direction === "up" && idx === prev.elements.length - 1) return prev;
      if (direction === "down" && idx === 0) return prev;
      const arr = [...prev.elements];
      const target = direction === "up" ? idx + 1 : idx - 1;
      const tmp = arr[idx];
      arr[idx] = arr[target];
      arr[target] = tmp;
      return { ...prev, elements: arr };
    });
  };

  const handleSave = async () => {
    const hasPlaceholder = editingTemplate.elements.some((el) => el.type === "placeholder");
    if (!hasPlaceholder) {
      const ok = await openConfirm(
        "Deine Vorlage hat keinen Motiv-Platzhalter. Trotzdem speichern?",
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      await patchTemplate(editingTemplate.id, {
        name: editingTemplate.name,
        default_frame_style: editingTemplate.defaultFrameStyle ?? "none",
        frame_shadow_outer_enabled: editingTemplate.frameShadowOuterEnabled === true,
        frame_shadow_inner_enabled: editingTemplate.frameShadowInnerEnabled === true,
        frame_outer_sides: editingTemplate.frameOuterSides ?? FRAME_SHADOW_ALL,
        frame_inner_sides: editingTemplate.frameInnerSides ?? FRAME_SHADOW_ALL,
        frame_shadow_depth: editingTemplate.frameShadowDepth ?? 0.82,
        artwork_saturation: editingTemplate.artworkSaturation ?? 1,
      });
      await replaceTemplateElements(editingTemplate.id, editingTemplate.elements);
      await onSaved();
      toast.success("Vorlage gespeichert.");
      setEditingTemplate(null);
      setSelectedElementId(null);
      setIsDrawMode(false);
      setDrawPoints([]);
      setCursorPoint(null);
    } catch (e) {
      console.error(e);
      toast.error(`Speichern fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDraw = () => {
    setIsDrawMode((v) => !v);
    setDrawPoints([]);
    setCursorPoint(null);
    setSelectedElementId(null);
  };

  const handleBackgroundReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editingTemplate) return;
    setReplacingBg(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
        reader.readAsDataURL(file);
      });
      const compressed = await compressImage(dataUrl);
      const img = await loadImage(compressed);
      const newW = img.width;
      const newH = img.height;
      const prev = editingTemplate;
      const fd = new FormData();
      fd.append(
        "background_image",
        await dataUrlToBlob(compressed),
        file.name.replace(/\.[^/.]+$/, "") + ".jpg",
      );
      fd.append("width", String(newW));
      fd.append("height", String(newH));
      await patchTemplate(prev.id, fd);
      const scaledElements = scaleElementsForCanvas(
        prev.elements,
        prev.width,
        prev.height,
        newW,
        newH,
      );
      const merged = await replaceTemplateElements(prev.id, scaledElements);
      setEditingTemplate(merged);
      await onSaved();
      toast.success("Hintergrundbild wurde ersetzt.");
    } catch (err) {
      console.error(err);
      toast.error(
        `Hintergrund konnte nicht gewechselt werden: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setReplacingBg(false);
    }
  };

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-col gap-4 select-none">
      {saving ? <LinearLoadingBar message="Vorlage wird gespeichert…" /> : null}
      {replacingBg ? <LinearLoadingBar message="Hintergrundbild wird gewechselt…" /> : null}

      <div
        className="grid min-h-0 w-full min-w-0 gap-4 max-lg:grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_320px]"
        style={{ minHeight: "min(820px, calc(100dvh - 100px))" }}
      >
        <aside
          aria-label="Editor-Werkzeuge und Aktionen"
          className={cn(workspacePanelCardClassName, "order-1 min-h-[20rem] max-lg:min-h-0")}
        >
          <div className={WORKSPACE_PANEL_HEADER}>
            <div className="flex w-full items-center justify-between gap-2">
              <div className="min-w-0">
                <div className={WORKSPACE_PANEL_TITLE}>Editor</div>
                <div className="text-xs text-[color:var(--pf-fg-subtle)]">
                  Aktionen &amp; Werkzeuge
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 gap-1.5 px-2.5"
                onClick={onClose}
                aria-label="Zurück zur Übersicht"
              >
                <ArrowLeft size={14} strokeWidth={1.75} aria-hidden />
                <span className="sr-only sm:not-sr-only sm:inline">Zurück</span>
              </Button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 space-y-2 border-b border-[color:var(--pf-border-subtle)] p-3.5">
              <label
                className={cn(
                  "flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[color:var(--pf-bg-elevated)] px-3 py-2.5 text-xs font-semibold text-[color:var(--pf-fg)] shadow-[var(--pf-shadow-sm)] ring-1 ring-[color:var(--pf-border)] transition-colors hover:bg-[color:var(--pf-bg-muted)]",
                  saving || replacingBg ? "pointer-events-none opacity-50" : "",
                )}
                title="Neues JPG/PNG/Webp als Vorlagen-Hintergrund"
              >
                <ImageUp size={16} strokeWidth={1.75} aria-hidden />
                Hintergrund ersetzen
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(ev) => void handleBackgroundReplace(ev)}
                  disabled={saving || replacingBg}
                />
              </label>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || replacingBg}
                className="w-full gap-2"
                size="sm"
              >
                <Save size={16} strokeWidth={1.75} /> {saving ? "Speichern…" : "Speichern"}
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2.5">
              <Toolbar
                layout="bar"
                isDrawMode={isDrawMode}
                onToggleDrawMode={handleToggleDraw}
                onAddElement={addElement}
                disabled={previewEndView}
              />
            </div>
          </div>
        </aside>

        <WorkspacePanelCard
          title={
            <div className="flex w-full min-w-0 flex-col gap-2.5">
              <h3 className={WORKSPACE_PANEL_TITLE}>Vorlage</h3>
              <Input
                id="template-editor-vorlage-name"
                label="Name der Vorlage"
                value={editingTemplate.name}
                onChange={(e) =>
                  updateEditingTemplate((prev) =>
                    prev ? { ...prev, name: e.target.value } : prev,
                  )
                }
                placeholder="z. B. Produkt-Mockup, Shop-Titel …"
                title="Vorlage umbenennen"
                autoComplete="off"
                disabled={saving || replacingBg}
              />
            </div>
          }
          className="order-2 min-h-[min(24rem,50vh)] min-w-0 lg:min-h-0 lg:h-full"
          bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
        >
          <CanvasViewport
            editingTemplate={editingTemplate}
            previewEndView={previewEndView}
            previewMotifUrl={previewMotifUrl}
            isSnapEnabled={isSnapEnabled}
            setIsSnapEnabled={setIsSnapEnabled}
            isGuideSnapEnabled={isGuideSnapEnabled}
            setIsGuideSnapEnabled={setIsGuideSnapEnabled}
            isDrawMode={isDrawMode}
            setIsDrawMode={setIsDrawMode}
            drawPoints={drawPoints}
            setDrawPoints={setDrawPoints}
            cursorPoint={cursorPoint}
            setCursorPoint={setCursorPoint}
          />
        </WorkspacePanelCard>

        <div
          className={cn(workspacePanelCardClassName, "order-3 min-h-[20rem] lg:min-h-0")}
          aria-label="Vorlagen-Einstellungen"
        >
          {previewEndView ? (
            <p className="shrink-0 border-b border-[color:var(--pf-border-subtle)] bg-amber-50 px-3 py-2.5 text-center text-[11px] font-semibold leading-snug text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              Endansicht aktiv — Ebenen- und Eigenschaften-Tabs sind eingeschränkt.
            </p>
          ) : null}
          <div className="flex shrink-0 border-b border-[color:var(--pf-border)]">
            {(
              [
                { id: 0 as const, label: "Mockup" },
                { id: 1 as const, label: "Ebenen" },
                { id: 2 as const, label: "Eigenschaften" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setRightTab(t.id)}
                className={cn(
                  "flex-1 px-3 py-2.5 text-center text-xs font-medium transition-colors",
                  rightTab === t.id
                    ? "border-b-2 border-[color:var(--pf-accent)] text-[color:var(--pf-fg)]"
                    : "border-b-2 border-transparent text-[color:var(--pf-fg-muted)] hover:text-[color:var(--pf-fg)]",
                )}
              >
                {t.id === 1 ? `${t.label} (${editingTemplate.elements.length})` : t.label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3.5">
            {rightTab === 0 ? (
              <>
                <div className="space-y-4">
                  <p className={cn("text-xs font-medium leading-relaxed", WORKSPACE_ZINC_MUTED)}>
                    Gilt für Generator und Etsy. Reihenfolge: Rahmen → Schatten → Farbe → Vorschau.
                  </p>
              <Select
                label="Rahmen"
                value={editingTemplate.defaultFrameStyle ?? "none"}
                onChange={(e) =>
                  updateEditingTemplate((prev) =>
                    prev ? { ...prev, defaultFrameStyle: e.target.value as FrameStyle } : prev,
                  )
                }
              >
                <option value="none">Ohne Rahmen</option>
                <option value="black">Schwarz</option>
                <option value="wood">Holz</option>
                <option value="white">Weiß</option>
              </Select>
              <div className="space-y-3">
                <span className="text-sm font-semibold text-[color:var(--pf-fg)]">Rahmen-Schatten</span>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[color:var(--pf-fg)]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[color:var(--pf-border)] accent-indigo-600"
                      checked={frameShadowOuterOn}
                      onChange={handleToggleFrameShadowOuter}
                      aria-label="Außenschatten aktivieren"
                    />
                    Außen
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[color:var(--pf-fg)]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[color:var(--pf-border)] accent-indigo-600"
                      checked={frameShadowInnerOn}
                      onChange={handleToggleFrameShadowInner}
                      aria-label="Innenschatten aktivieren"
                    />
                    Innen
                  </label>
                </div>
                {frameShadowOuterOn ? (
                  <fieldset className="space-y-2 rounded-[length:var(--pf-radius)] bg-[color:var(--pf-bg-muted)]/80 p-3 ring-1 ring-inset ring-[color:var(--pf-border-subtle)]">
                    <legend className="px-1 text-xs font-semibold text-[color:var(--pf-fg-muted)]">
                      Außen – Seiten
                    </legend>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[color:var(--pf-fg)]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[color:var(--pf-border)] accent-indigo-600"
                        checked={outerSidesMask === FRAME_SHADOW_ALL}
                        onChange={handleOuterSidesAll}
                        aria-label="Alle Außenseiten"
                      />
                      Alle Seiten
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {FRAME_SHADOW_SIDE_ORDER.map((side) => {
                        const bit = frameShadowBitForSide(side);
                        const checked = (outerSidesMask & bit) !== 0;
                        const id = `frame-outer-side-${side}`;
                        return (
                          <label
                            key={side}
                            htmlFor={id}
                            className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[color:var(--pf-fg)]"
                          >
                            <input
                              id={id}
                              type="checkbox"
                              className="h-4 w-4 rounded border-[color:var(--pf-border)] accent-indigo-600"
                              checked={checked}
                              onChange={() => handleToggleOuterSide(side)}
                            />
                            {FRAME_SHADOW_SIDE_LABEL[side]}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : null}
                {frameShadowInnerOn ? (
                  <fieldset className="space-y-2 rounded-[length:var(--pf-radius)] bg-[color:var(--pf-bg-muted)]/80 p-3 ring-1 ring-inset ring-[color:var(--pf-border-subtle)]">
                    <legend className="px-1 text-xs font-semibold text-[color:var(--pf-fg-muted)]">
                      Innen – Seiten
                    </legend>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[color:var(--pf-fg)]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[color:var(--pf-border)] accent-indigo-600"
                        checked={innerSidesMask === FRAME_SHADOW_ALL}
                        onChange={handleInnerSidesAll}
                        aria-label="Alle Innenseiten"
                      />
                      Alle Seiten
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {FRAME_SHADOW_SIDE_ORDER.map((side) => {
                        const bit = frameShadowBitForSide(side);
                        const checked = (innerSidesMask & bit) !== 0;
                        const id = `frame-inner-side-${side}`;
                        return (
                          <label
                            key={side}
                            htmlFor={id}
                            className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[color:var(--pf-fg)]"
                          >
                            <input
                              id={id}
                              type="checkbox"
                              className="h-4 w-4 rounded border-[color:var(--pf-border)] accent-indigo-600"
                              checked={checked}
                              onChange={() => handleToggleInnerSide(side)}
                            />
                            {FRAME_SHADOW_SIDE_LABEL[side]}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : null}
              </div>
              {anyFrameShadowOn ? (
                <div>
                  <label className="text-sm font-semibold text-[color:var(--pf-fg)]" htmlFor="frame-shadow-depth">
                    Stärke / Tiefe ({Math.round((editingTemplate.frameShadowDepth ?? 0.82) * 100)}&nbsp;%)
                  </label>
                  <input
                    id="frame-shadow-depth"
                    type="range"
                    min={15}
                    max={100}
                    step={1}
                    value={Math.round((editingTemplate.frameShadowDepth ?? 0.82) * 100)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateEditingTemplate((prev) =>
                        prev ? { ...prev, frameShadowDepth: Math.min(1, Math.max(0.15, v / 100)) } : prev,
                      );
                    }}
                    className="mt-2 w-full accent-indigo-600"
                  />
                  <p className={cn("mt-1 text-xs font-medium", WORKSPACE_ZINC_MUTED)}>
                    Ein Regler für Außen- und Innenschatten: weicher/größer bzw. kräftigere Motiv-Tiefe.
                  </p>
                </div>
              ) : null}
              <div>
                <label className="text-sm font-semibold text-[color:var(--pf-fg)]" htmlFor="artwork-saturation">
                  Motiv-Sättigung ({Math.round((editingTemplate.artworkSaturation ?? 1) * 100)}&nbsp;%)
                </label>
                <input
                  id="artwork-saturation"
                  type="range"
                  min={15}
                  max={100}
                  step={1}
                  value={Math.round((editingTemplate.artworkSaturation ?? 1) * 100)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    updateEditingTemplate((prev) =>
                      prev ? { ...prev, artworkSaturation: Math.min(1, Math.max(0.15, v / 100)) } : prev,
                    );
                  }}
                  className="mt-2 w-full accent-indigo-600"
                />
                <p className={cn("mt-1 text-xs font-medium", WORKSPACE_ZINC_MUTED)}>
                  Niedrigere Werte wirken dezenter auf dem Hintergrund.
                </p>
              </div>
            </div>
            <div className="mt-4 border-t border-[color:var(--pf-border)] pt-4">
              <label className="flex cursor-pointer items-start gap-2.5 text-sm font-medium text-[color:var(--pf-fg)]">
                <input
                  type="checkbox"
                  checked={previewEndView}
                  onChange={(e) => setPreviewEndView(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-[color:var(--pf-border)] text-indigo-600 accent-indigo-600 focus:ring-indigo-500/30"
                />
                <span>
                  <span className="font-semibold">Endansicht-Vorschau</span>
                  <span className={cn("mt-0.5 block text-xs font-medium", WORKSPACE_ZINC_MUTED)}>
                    Wie das fertige Motiv im Export – ohne Hilfslinien und Rahmen-Markierung.
                  </span>
                </span>
              </label>
              <div
                className={`mt-3 transition-opacity ${previewEndView ? "opacity-100" : "pointer-events-none opacity-40"}`}
              >
                <p className={cn("mb-2 text-xs font-semibold", WORKSPACE_ZINC_MUTED)}>Beispielmotiv</p>
                <div className="grid grid-cols-5 gap-2" role="list">
                  {Array.from({ length: PREVIEW_MOTIF_VARIANT_COUNT }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="listitem"
                      disabled={!previewEndView}
                      onClick={() => setPreviewMotifVariant(i)}
                      className={`relative aspect-square rounded-[length:var(--pf-radius)] transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 ${
                        previewMotifVariant === i
                          ? "shadow-[var(--pf-shadow-sm)] ring-2 ring-[color:var(--pf-accent)] ring-offset-2 ring-offset-[color:var(--pf-bg-elevated)]"
                          : "ring-1 ring-[color:var(--pf-border)] hover:ring-[color:var(--pf-border-strong)]"
                      }`}
                      style={{ background: previewVariantSwatchStyle(i) }}
                      title={`Motiv ${i + 1}`}
                      aria-label={`Beispielmotiv ${i + 1} wählen`}
                      aria-pressed={previewMotifVariant === i}
                    >
                      <span className="sr-only">Variante {i + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
                </>
            ) : null}
            {rightTab === 1 ? (
              <div className={cn(previewEndView && "pointer-events-none opacity-40")}>
                <LayerManager
                  editingTemplate={editingTemplate}
                  selectedElementId={selectedElementId}
                  onSelect={setSelectedElementId}
                  onMove={moveElement}
                  onDuplicate={duplicateElement}
                  onDelete={deleteElement}
                />
              </div>
            ) : null}
            {rightTab === 2 ? (
              <div className={cn(previewEndView && "pointer-events-none opacity-40")}>
                <PropertiesPanel activeEl={activeEl} onUpdate={updateActiveElement} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
