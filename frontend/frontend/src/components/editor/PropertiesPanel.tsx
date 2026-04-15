import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Settings } from "lucide-react";

import { FONT_FAMILIES } from "../../lib/constants";
import type { TemplateElement } from "../../types/mockup";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Slider } from "../ui/Slider";

type Props = {
  activeEl: TemplateElement | null;
  onUpdate: (key: keyof TemplateElement, value: string | number | boolean) => void;
};

export const PropertiesPanel = ({ activeEl, onUpdate }: Props) => {
  if (!activeEl) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
        Wähle ein Element im Bild oder in den Ebenen.
      </div>
    );
  }

  return (
    <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-800">
        <Settings size={16} className="text-slate-400" strokeWidth={1.75} /> Eigenschaften
      </h4>
      <div className="space-y-5">
        <Input
          label="Name"
          value={activeEl.name ?? ""}
          onChange={(e) => onUpdate("name", e.target.value)}
        />

        {activeEl.type === "text" && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Text</label>
              <textarea
                value={activeEl.text ?? ""}
                onChange={(e) => onUpdate("text", e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Farbe</label>
                <input
                  type="color"
                  value={activeEl.color?.slice(0, 7) ?? "#000000"}
                  onChange={(e) => onUpdate("color", e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-lg border border-slate-300 p-0.5"
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Stil & Ausrichtung</label>
              <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  className={`flex flex-1 justify-center rounded-md p-1.5 transition-all ${
                    activeEl.fontWeight === "bold" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-slate-200"
                  }`}
                  onClick={() => onUpdate("fontWeight", activeEl.fontWeight === "bold" ? "normal" : "bold")}
                >
                  <Bold size={15} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  className={`flex flex-1 justify-center rounded-md p-1.5 transition-all ${
                    activeEl.fontStyle === "italic" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-slate-200"
                  }`}
                  onClick={() => onUpdate("fontStyle", activeEl.fontStyle === "italic" ? "normal" : "italic")}
                >
                  <Italic size={15} strokeWidth={1.75} />
                </button>
                <div className="mx-1 my-1 w-px bg-slate-300" />
                {(["left", "center", "right"] as const).map((al) => (
                  <button
                    key={al}
                    type="button"
                    className={`flex flex-1 justify-center rounded-md p-1.5 transition-all ${
                      activeEl.textAlign === al ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-slate-200"
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
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Füllfarbe</label>
            <input
              type="color"
              value={activeEl.color?.slice(0, 7) ?? "#e5e7eb"}
              onChange={(e) => onUpdate("color", e.target.value)}
              className="h-10 w-full cursor-pointer rounded-lg border border-slate-300 p-0.5"
            />
          </div>
        )}

        <div className="border-t border-slate-200 pt-3">
          <Slider
            label="Rotation"
            hintRight={`${activeEl.rotation ?? 0}°`}
            min={-180}
            max={180}
            value={activeEl.rotation ?? 0}
            onChange={(e) => onUpdate("rotation", Number(e.target.value))}
          />
        </div>

        <div className="border-t border-slate-200 pt-3">
          <label className="mb-3 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={activeEl.shadowEnabled ?? false}
              onChange={(e) => onUpdate("shadowEnabled", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 accent-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-700">Schatten aktivieren</span>
          </label>
          {activeEl.shadowEnabled && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Farbe</label>
                <input
                  type="color"
                  value={(activeEl.shadowColor ?? "#000000").slice(0, 7)}
                  onChange={(e) => onUpdate("shadowColor", `${e.target.value}80`)}
                  className="h-7 w-full cursor-pointer rounded-md border border-slate-300 p-0.5"
                  title="Schattenfarbe"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Blur</label>
                <Input
                  type="number"
                  value={activeEl.shadowBlur ?? 0}
                  onChange={(e) => onUpdate("shadowBlur", Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">X</label>
                <Input
                  type="number"
                  value={activeEl.shadowOffsetX ?? 0}
                  onChange={(e) => onUpdate("shadowOffsetX", Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Y</label>
                <Input
                  type="number"
                  value={activeEl.shadowOffsetY ?? 0}
                  onChange={(e) => onUpdate("shadowOffsetY", Number(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 pt-3">
          <label className="mb-2 block text-sm font-medium text-slate-700">Position & Dimensionen (px)</label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(["x", "y", "w", "h"] as const).map((axis) => (
              <div
                key={axis}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2"
              >
                <span className="ml-1 text-xs font-semibold uppercase text-slate-500">{axis}</span>
                <input
                  type="number"
                  value={activeEl[axis]}
                  onChange={(e) => onUpdate(axis, Number(e.target.value))}
                  className="w-16 bg-transparent text-right text-sm font-medium text-slate-800 outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
