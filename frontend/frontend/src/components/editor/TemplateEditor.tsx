import { ArrowLeft, ImageUp, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { patchTemplate, replaceTemplateElements } from "../../api/sets";
import { compressImage, dataUrlToBlob, loadImage } from "../../lib/canvas/image";
import {
  createPreviewMotifDataUrl,
  PREVIEW_MOTIF_VARIANT_COUNT,
  previewVariantSwatchStyle,
} from "../../lib/previewSampleMotif";
import { newClientElementId } from "../../lib/elementId";
import {
  FRAME_SHADOW_ALL,
  FRAME_SHADOW_SIDE_ORDER,
  type FrameShadowSideId,
  frameShadowBitForSide,
  toggleSideInMask,
} from "../../lib/frameShadowSides";
import { toast } from "../../lib/toast";
import type { ElementType, FrameStyle, TemplateElement } from "../../types/mockup";
import { useAppStore } from "../../store/appStore";
import { Button } from "../ui/Button";
import { LinearLoadingBar } from "../ui/LinearLoadingBar";
import { Select } from "../ui/Select";
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

/** Elemente proportional auf neue Hintergrund-Abmessungen skalieren. */
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
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-6">
      {saving ? <LinearLoadingBar message="Vorlage wird gespeichert…" /> : null}
      {replacingBg ? <LinearLoadingBar message="Hintergrundbild wird gewechselt…" /> : null}
      <div className="mb-4 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex w-full items-center gap-3 md:w-auto">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800"
            aria-label="Zurück"
          >
            <ArrowLeft size={20} />
          </button>
          <input
            type="text"
            value={editingTemplate.name}
            onChange={(e) =>
              updateEditingTemplate((prev) => (prev ? { ...prev, name: e.target.value } : prev))
            }
            className="flex-1 cursor-text border-b border-dashed border-transparent bg-transparent pb-1 text-2xl font-bold outline-none hover:border-neutral-300 focus:border-blue-500"
            title="Vorlage umbenennen"
          />
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
          <label
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 ${
              saving || replacingBg ? "pointer-events-none opacity-50" : ""
            }`}
            title="Neues JPG/PNG/Webp als Vorlagen-Hintergrund"
          >
            <ImageUp size={18} aria-hidden />
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
            className="gap-2 px-6 py-2 font-bold"
          >
            <Save size={18} /> {saving ? "Speichern…" : "Speichern"}
          </Button>
        </div>
      </div>

      <Toolbar
        isDrawMode={isDrawMode}
        onToggleDrawMode={handleToggleDraw}
        onAddElement={addElement}
        disabled={previewEndView}
      />

      <div className="grid h-[650px] grid-cols-1 gap-6 select-none lg:grid-cols-4">
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

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1 lg:col-span-1">
          <section className="shrink-0 rounded-xl border border-neutral-200 bg-gradient-to-b from-neutral-50/95 to-white p-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Mockup & Export
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Gilt für Generator und Etsy. Reihenfolge: Rahmen → Schatten → Farbe → Vorschau.
            </p>
            <div className="mt-3 space-y-4">
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
                <span className="text-xs font-medium text-neutral-600">Rahmen-Schatten</span>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-neutral-300 accent-blue-600"
                      checked={frameShadowOuterOn}
                      onChange={handleToggleFrameShadowOuter}
                      aria-label="Außenschatten aktivieren"
                    />
                    Außen
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-neutral-300 accent-blue-600"
                      checked={frameShadowInnerOn}
                      onChange={handleToggleFrameShadowInner}
                      aria-label="Innenschatten aktivieren"
                    />
                    Innen
                  </label>
                </div>
                {frameShadowOuterOn ? (
                  <fieldset className="space-y-2 rounded-lg border border-neutral-200/80 bg-white/60 p-3">
                    <legend className="px-1 text-xs font-medium text-neutral-600">
                      Außen – Seiten
                    </legend>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-neutral-300 accent-blue-600"
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
                            className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800"
                          >
                            <input
                              id={id}
                              type="checkbox"
                              className="h-4 w-4 rounded border-neutral-300 accent-blue-600"
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
                  <fieldset className="space-y-2 rounded-lg border border-neutral-200/80 bg-white/60 p-3">
                    <legend className="px-1 text-xs font-medium text-neutral-600">
                      Innen – Seiten
                    </legend>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-neutral-300 accent-blue-600"
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
                            className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800"
                          >
                            <input
                              id={id}
                              type="checkbox"
                              className="h-4 w-4 rounded border-neutral-300 accent-blue-600"
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
                  <label className="text-xs font-medium text-neutral-600" htmlFor="frame-shadow-depth">
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
                    className="mt-2 w-full accent-blue-600"
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    Ein Regler für Außen- und Innenschatten: weicher/größer bzw. kräftigere Motiv-Tiefe.
                  </p>
                </div>
              ) : null}
              <div>
                <label className="text-xs font-medium text-neutral-600" htmlFor="artwork-saturation">
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
                  className="mt-2 w-full accent-blue-600"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Niedrigere Werte wirken dezenter auf dem Hintergrund.
                </p>
              </div>
            </div>
            <div className="mt-4 border-t border-neutral-200/90 pt-4">
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-neutral-800">
                <input
                  type="checkbox"
                  checked={previewEndView}
                  onChange={(e) => setPreviewEndView(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  <span className="font-medium">Endansicht-Vorschau</span>
                  <span className="mt-0.5 block text-xs font-normal text-neutral-500">
                    Wie das fertige Motiv im Export – ohne Hilfslinien und Rahmen-Markierung.
                  </span>
                </span>
              </label>
              <div
                className={`mt-3 transition-opacity ${previewEndView ? "opacity-100" : "pointer-events-none opacity-40"}`}
              >
                <p className="mb-2 text-xs font-medium text-neutral-600">Beispielmotiv</p>
                <div className="grid grid-cols-5 gap-2" role="list">
                  {Array.from({ length: PREVIEW_MOTIF_VARIANT_COUNT }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="listitem"
                      disabled={!previewEndView}
                      onClick={() => setPreviewMotifVariant(i)}
                      className={`relative aspect-square rounded-lg border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                        previewMotifVariant === i
                          ? "border-blue-600 shadow-md ring-2 ring-blue-400/40"
                          : "border-neutral-200 hover:border-neutral-300"
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
          </section>

          {previewEndView ? (
            <p className="shrink-0 rounded-lg border border-dashed border-amber-200/80 bg-amber-50/90 px-3 py-2 text-center text-xs text-neutral-700">
              Ebenen und Eigenschaften sind in der Vorschau pausiert – Endansicht ausschalten zum Bearbeiten.
            </p>
          ) : null}
          <div
            className={`flex min-h-0 flex-1 flex-col gap-4 ${previewEndView ? "pointer-events-none opacity-40" : ""}`}
          >
            <LayerManager
              editingTemplate={editingTemplate}
              selectedElementId={selectedElementId}
              onSelect={setSelectedElementId}
              onMove={moveElement}
              onDuplicate={duplicateElement}
              onDelete={deleteElement}
            />
            <PropertiesPanel activeEl={activeEl} onUpdate={updateActiveElement} />
          </div>
        </div>
      </div>
    </div>
  );
};
