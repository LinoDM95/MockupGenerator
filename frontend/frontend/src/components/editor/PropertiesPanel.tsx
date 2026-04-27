import { AlignCenter, AlignLeft, AlignRight, Bold, Eraser, Italic, Paintbrush } from "lucide-react";

import { FONT_FAMILIES } from "../../lib/editor/constants";
import type { TemplateElement } from "../../types/mockup";
import { Button } from "../ui/primitives/Button";
import { Input } from "../ui/primitives/Input";
import { Select } from "../ui/primitives/Select";
import { Slider } from "../ui/primitives/Slider";
import type { OcclusionPaintTool } from "./OcclusionMaskPaintLayer";

type Props = {
  activeEl: TemplateElement | null;
  onUpdate: (key: keyof TemplateElement, value: string | number | boolean) => void;
  onPatch: (patch: Partial<TemplateElement>) => void;
  occlusionPaintActive?: boolean;
  onStartOcclusionPaint?: () => void;
  onEndOcclusionPaint?: () => void;
  canStartOcclusionPaint?: boolean;
  occlusionPaintTool?: OcclusionPaintTool;
  onOcclusionPaintToolChange?: (tool: OcclusionPaintTool) => void;
  occlusionBrushPx?: number;
  onOcclusionBrushPxChange?: (px: number) => void;
};

export const PropertiesPanel = ({
  activeEl,
  onUpdate,
  onPatch,
  occlusionPaintActive = false,
  onStartOcclusionPaint,
  onEndOcclusionPaint,
  canStartOcclusionPaint = false,
  occlusionPaintTool = "brush",
  onOcclusionPaintToolChange,
  occlusionBrushPx = 28,
  onOcclusionBrushPxChange,
}: Props) => {
  if (!activeEl) {
    return (
      <div className="rounded-[length:var(--pf-radius)] bg-[color:var(--pf-bg-muted)]/50 px-4 py-8 text-center text-sm font-medium text-[color:var(--pf-fg-muted)] ring-1 ring-inset ring-dashed ring-[color:var(--pf-border)]">
        Wähle ein Element im Bild oder in den Ebenen.
      </div>
    );
  }

  const isQuadPlaceholder = activeEl.type === "placeholder" && activeEl.placeholderShape === "quad";

  return (
    <div className="flex-1 space-y-5">
        <Input
          label="Name"
          value={activeEl.name ?? ""}
          onChange={(e) => onUpdate("name", e.target.value)}
        />

        {activeEl.type === "placeholder" && (
          <div className="rounded-[length:var(--pf-radius)] bg-[color:var(--pf-bg-muted)]/80 p-3 ring-1 ring-inset ring-[color:var(--pf-border-subtle)]">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={activeEl.placeholderShape === "quad"}
                onChange={(e) => {
                  if (e.target.checked) {
                    onPatch({ placeholderShape: "quad", rotation: 0 });
                  } else {
                    onPatch({ placeholderShape: "rect" });
                  }
                }}
                className="h-4 w-4 rounded border-[color:var(--pf-border)] text-indigo-600 accent-indigo-600 focus:ring-indigo-500/30"
              />
              <span className="text-sm font-semibold text-[color:var(--pf-fg)]">Perspektive (4 Ecken)</span>
            </label>
            <p className="mt-2 text-xs font-medium leading-relaxed text-[color:var(--pf-fg-muted)]">
              Motiv wird perspektivisch auf ein Viereck gelegt — Ecken im Canvas ziehen (große Klickfläche). Mit
              gedrückter <span className="font-semibold text-[color:var(--pf-fg-subtle)]">Umschalttaste</span> bewegen
              sich die Ecken feiner. Ist der Platzhalter ausgewählt, sehen Sie die Beispiel-Motiv-Vorschau direkt auf
              der Vorlage (in der Endansicht zusätzlich mit Falten aus dem Hintergrund, sofern aktiv).
            </p>
          </div>
        )}

        {activeEl.type === "placeholder" && (
          <div className="rounded-[length:var(--pf-radius)] bg-[color:var(--pf-bg-muted)]/80 p-3 ring-1 ring-inset ring-[color:var(--pf-border-subtle)]">
            <p className="text-sm font-semibold text-[color:var(--pf-fg)]">Vordergrund-Occlusion</p>
            <p className="mt-1.5 text-xs font-medium leading-relaxed text-[color:var(--pf-fg-muted)]">
              Im Canvas über dem Mockup bemalen, wo das Motiv ausgeblendet werden soll (z. B. Haare, Hände, Träger).
              Weiß in der Maske = Motiv unsichtbar, Schwarz = Motiv sichtbar. Die Maske nutzt dieselbe Auflösung wie
              Ihr Mockup.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!occlusionPaintActive ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canStartOcclusionPaint || !onStartOcclusionPaint}
                  onClick={() => onStartOcclusionPaint?.()}
                >
                  Maske malen
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => onEndOcclusionPaint?.()}>
                  Fertig
                </Button>
              )}
              {activeEl.occlusionMaskUrl ? (
                <Button type="button" variant="outline" size="sm" onClick={() => onPatch({ occlusionMaskUrl: "" })}>
                  Maske entfernen
                </Button>
              ) : null}
            </div>
            {occlusionPaintActive ? (
              <div className="mt-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--pf-fg-subtle)]">
                  Werkzeug
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={occlusionPaintTool === "brush" ? "primary" : "outline"}
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => onOcclusionPaintToolChange?.("brush")}
                    aria-pressed={occlusionPaintTool === "brush"}
                  >
                    <Paintbrush size={14} strokeWidth={1.75} aria-hidden />
                    Pinsel
                  </Button>
                  <Button
                    type="button"
                    variant={occlusionPaintTool === "eraser" ? "primary" : "outline"}
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => onOcclusionPaintToolChange?.("eraser")}
                    aria-pressed={occlusionPaintTool === "eraser"}
                  >
                    <Eraser size={14} strokeWidth={1.75} aria-hidden />
                    Radierer
                  </Button>
                </div>
                <Slider
                  label="Pinselgröße"
                  hintRight={`${occlusionBrushPx}px`}
                  min={4}
                  max={120}
                  step={2}
                  value={occlusionBrushPx}
                  onChange={(e) => onOcclusionBrushPxChange?.(Number(e.target.value))}
                />
              </div>
            ) : null}
            <div className="mt-4 space-y-3">
              <Slider
                label="Occlusion-Stärke"
                hintRight={`${Math.round((activeEl.occlusionStrength ?? 1) * 100)} %`}
                min={0}
                max={100}
                value={Math.round((activeEl.occlusionStrength ?? 1) * 100)}
                onChange={(e) =>
                  onUpdate(
                    "occlusionStrength",
                    Math.min(1, Math.max(0, Number(e.target.value) / 100)),
                  )
                }
              />
              <Slider
                label="Kanten-Feather"
                hintRight={`${activeEl.occlusionFeather ?? 2} px`}
                min={0}
                max={8}
                step={1}
                value={activeEl.occlusionFeather ?? 2}
                onChange={(e) => onUpdate("occlusionFeather", Number(e.target.value))}
              />
            </div>
          </div>
        )}

        {activeEl.type === "text" && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[color:var(--pf-fg)]">Text</label>
              <textarea
                value={activeEl.text ?? ""}
                onChange={(e) => onUpdate("text", e.target.value)}
                rows={2}
                className="w-full resize-none rounded-[length:var(--pf-radius)] border border-[color:var(--pf-border)] bg-[color:var(--pf-bg-elevated)] p-2.5 text-sm text-[color:var(--pf-fg)] outline-none transition-all duration-200 placeholder:text-[color:var(--pf-fg-faint)] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select
                label="Schriftart"
                value={activeEl.fontFamily ?? "Arial"}
                onChange={(e) => onUpdate("fontFamily", e.target.value)}
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: f }}>
                    {f}
                  </option>
                ))}
              </Select>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[color:var(--pf-fg)]">Farbe</label>
                <input
                  type="color"
                  value={activeEl.color?.slice(0, 7) ?? "#000000"}
                  onChange={(e) => onUpdate("color", e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-[length:var(--pf-radius)] border border-[color:var(--pf-border)] p-0.5"
                />
              </div>
            </div>
            <Slider
              label="Schriftgröße"
              hintRight={`${activeEl.fontSize ?? 60}px`}
              min={10}
              max={600}
              value={activeEl.fontSize ?? 60}
              onChange={(e) => onUpdate("fontSize", Number(e.target.value))}
            />
            <Slider
              label="Text-Bogen"
              hintRight={`${activeEl.textCurve ?? 0}°`}
              min={-360}
              max={360}
              value={activeEl.textCurve ?? 0}
              onChange={(e) => onUpdate("textCurve", Number(e.target.value))}
            />
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[color:var(--pf-fg)]">
                Stil &amp; Ausrichtung
              </label>
              <div className="flex gap-1 rounded-[length:var(--pf-radius)] bg-[color:var(--pf-bg-muted)] p-1 ring-1 ring-inset ring-[color:var(--pf-border-subtle)]">
                <button
                  type="button"
                  className={`flex flex-1 justify-center rounded-md p-1.5 transition-all ${
                    activeEl.fontWeight === "bold"
                      ? "bg-[color:var(--pf-bg-elevated)] text-indigo-600 shadow-[var(--pf-shadow-sm)]"
                      : "text-[color:var(--pf-fg-muted)] hover:bg-[color:var(--pf-bg-elevated)]"
                  }`}
                  onClick={() => onUpdate("fontWeight", activeEl.fontWeight === "bold" ? "normal" : "bold")}
                >
                  <Bold size={15} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  className={`flex flex-1 justify-center rounded-md p-1.5 transition-all ${
                    activeEl.fontStyle === "italic"
                      ? "bg-[color:var(--pf-bg-elevated)] text-indigo-600 shadow-[var(--pf-shadow-sm)]"
                      : "text-[color:var(--pf-fg-muted)] hover:bg-[color:var(--pf-bg-elevated)]"
                  }`}
                  onClick={() => onUpdate("fontStyle", activeEl.fontStyle === "italic" ? "normal" : "italic")}
                >
                  <Italic size={15} strokeWidth={1.75} />
                </button>
                <div className="mx-1 my-1 w-px bg-[color:var(--pf-border)]" />
                {(["left", "center", "right"] as const).map((al) => (
                  <button
                    key={al}
                    type="button"
                    className={`flex flex-1 justify-center rounded-md p-1.5 transition-all ${
                      activeEl.textAlign === al
                        ? "bg-[color:var(--pf-bg-elevated)] text-indigo-600 shadow-[var(--pf-shadow-sm)]"
                        : "text-[color:var(--pf-fg-muted)] hover:bg-[color:var(--pf-bg-elevated)]"
                    }`}
                    onClick={() => onUpdate("textAlign", al)}
                  >
                    {al === "left" ? <AlignLeft size={15} strokeWidth={1.75} /> : al === "center" ? <AlignCenter size={15} strokeWidth={1.75} /> : <AlignRight size={15} strokeWidth={1.75} />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {["rect", "circle", "triangle", "star", "hexagon"].includes(activeEl.type) && (
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[color:var(--pf-fg)]">Füllfarbe</label>
            <input
              type="color"
              value={activeEl.color?.slice(0, 7) ?? "#e5e7eb"}
              onChange={(e) => onUpdate("color", e.target.value)}
              className="h-10 w-full cursor-pointer rounded-[length:var(--pf-radius)] border border-[color:var(--pf-border)] p-0.5"
            />
          </div>
        )}

        <div className="border-t border-[color:var(--pf-border-subtle)] pt-3">
          <Slider
            label={isQuadPlaceholder ? "Rotation (bei Perspektive deaktiviert)" : "Rotation"}
            hintRight={`${activeEl.rotation ?? 0}°`}
            min={-180}
            max={180}
            value={activeEl.rotation ?? 0}
            disabled={isQuadPlaceholder}
            onChange={(e) => onUpdate("rotation", Number(e.target.value))}
          />
          {isQuadPlaceholder ? (
            <p className="mt-1.5 text-xs font-medium text-[color:var(--pf-fg-muted)]">
              Nutzen Sie die vier Eckpunkte am Platzhalter für die perspektivische Ausrichtung.
            </p>
          ) : null}
        </div>

        <div className="border-t border-[color:var(--pf-border-subtle)] pt-3">
          <label className="mb-3 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={activeEl.shadowEnabled ?? false}
              onChange={(e) => onUpdate("shadowEnabled", e.target.checked)}
              className="h-4 w-4 rounded border-[color:var(--pf-border)] text-indigo-600 accent-indigo-600 focus:ring-indigo-500/30"
            />
            <span className="text-sm font-semibold text-[color:var(--pf-fg)]">Schatten aktivieren</span>
          </label>
          {activeEl.shadowEnabled && (
            <div className="grid grid-cols-2 gap-3 rounded-[length:var(--pf-radius)] bg-[color:var(--pf-bg-muted)]/80 p-3 ring-1 ring-inset ring-[color:var(--pf-border-subtle)]">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[color:var(--pf-fg-muted)]">Farbe</label>
                <input
                  type="color"
                  value={(activeEl.shadowColor ?? "#000000").slice(0, 7)}
                  onChange={(e) => onUpdate("shadowColor", `${e.target.value}80`)}
                  className="h-7 w-full cursor-pointer rounded-md border border-[color:var(--pf-border)] p-0.5"
                  title="Schattenfarbe"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[color:var(--pf-fg-muted)]">Blur</label>
                <Input
                  type="number"
                  value={activeEl.shadowBlur ?? 0}
                  onChange={(e) => onUpdate("shadowBlur", Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[color:var(--pf-fg-muted)]">X</label>
                <Input
                  type="number"
                  value={activeEl.shadowOffsetX ?? 0}
                  onChange={(e) => onUpdate("shadowOffsetX", Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[color:var(--pf-fg-muted)]">Y</label>
                <Input
                  type="number"
                  value={activeEl.shadowOffsetY ?? 0}
                  onChange={(e) => onUpdate("shadowOffsetY", Number(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[color:var(--pf-border-subtle)] pt-3">
          <label className="mb-2 block text-sm font-semibold text-[color:var(--pf-fg)]">
            Position &amp; Dimensionen (px)
            {isQuadPlaceholder ? (
              <span className="ml-1 font-normal text-[color:var(--pf-fg-muted)]">
                — Rahmen um die Perspektive; Geometrie über Ecken
              </span>
            ) : null}
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(["x", "y", "w", "h"] as const).map((axis) => (
              <div
                key={axis}
                className={`flex items-center justify-between rounded-[length:var(--pf-radius)] bg-[color:var(--pf-bg-elevated)] px-3 py-2 shadow-[var(--pf-shadow-sm)] ring-1 ring-inset ring-[color:var(--pf-border)] focus-within:ring-2 focus-within:ring-indigo-500/25 ${isQuadPlaceholder ? "opacity-75" : ""}`}
              >
                <span className="ml-1 text-xs font-bold uppercase tracking-widest text-[color:var(--pf-fg-subtle)]">
                  {axis}
                </span>
                <input
                  type="number"
                  value={activeEl[axis]}
                  readOnly={isQuadPlaceholder}
                  aria-readonly={isQuadPlaceholder || undefined}
                  onChange={(e) => onUpdate(axis, Number(e.target.value))}
                  className="w-16 bg-transparent text-right text-sm font-semibold text-[color:var(--pf-fg)] outline-none read-only:cursor-not-allowed"
                />
              </div>
            ))}
          </div>
        </div>
    </div>
  );
};
