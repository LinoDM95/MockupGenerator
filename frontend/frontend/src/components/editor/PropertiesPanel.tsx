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
      <div className="mt-6 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm italic text-neutral-400">
        Wähle ein Element im Bild oder in den Ebenen.
      </div>
    );
  }

  return (
    <div className="flex-1 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h4 className="mb-4 flex items-center gap-2 border-b pb-2 font-bold text-neutral-800">
        <Settings size={18} className="text-neutral-500" /> Eigenschaften
      </h4>
      <div className="space-y-6">
        <Input
          label="Name"
          value={activeEl.name ?? ""}
          onChange={(e) => onUpdate("name", e.target.value)}
        />

        {activeEl.type === "text" && (
          <>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-neutral-500">Text</label>
              <textarea
                value={activeEl.text ?? ""}
                onChange={(e) => onUpdate("text", e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-sm outline-none focus:border-blue-500 focus:bg-white"
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
                <label className="mb-1 block text-xs font-bold uppercase text-neutral-500">Farbe</label>
                <input
                  type="color"
                  value={activeEl.color?.slice(0, 7) ?? "#000000"}
                  onChange={(e) => onUpdate("color", e.target.value)}
                  className="h-9 w-full cursor-pointer rounded border-none p-0"
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
              <label className="mb-1 block text-xs font-bold uppercase text-neutral-500">Stil & Ausrichtung</label>
              <div className="flex gap-1 rounded bg-neutral-100 p-1">
                <button
                  type="button"
                  className={`flex flex-1 justify-center rounded p-1.5 ${
                    activeEl.fontWeight === "bold" ? "bg-white text-blue-600 shadow" : "text-neutral-500 hover:bg-neutral-200"
                  }`}
                  onClick={() => onUpdate("fontWeight", activeEl.fontWeight === "bold" ? "normal" : "bold")}
                >
                  <Bold size={16} />
                </button>
                <button
                  type="button"
                  className={`flex flex-1 justify-center rounded p-1.5 ${
                    activeEl.fontStyle === "italic" ? "bg-white text-blue-600 shadow" : "text-neutral-500 hover:bg-neutral-200"
                  }`}
                  onClick={() => onUpdate("fontStyle", activeEl.fontStyle === "italic" ? "normal" : "italic")}
                >
                  <Italic size={16} />
                </button>
                <div className="mx-1 my-1 w-px bg-neutral-300" />
                {(["left", "center", "right"] as const).map((al) => (
                  <button
                    key={al}
                    type="button"
                    className={`flex flex-1 justify-center rounded p-1.5 ${
                      activeEl.textAlign === al ? "bg-white text-blue-600 shadow" : "text-neutral-500 hover:bg-neutral-200"
                    }`}
                    onClick={() => onUpdate("textAlign", al)}
                  >
                    {al === "left" ? <AlignLeft size={16} /> : al === "center" ? <AlignCenter size={16} /> : <AlignRight size={16} />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {["rect", "circle", "triangle", "star", "hexagon"].includes(activeEl.type) && (
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-neutral-500">Füllfarbe</label>
            <input
              type="color"
              value={activeEl.color?.slice(0, 7) ?? "#e5e7eb"}
              onChange={(e) => onUpdate("color", e.target.value)}
              className="h-10 w-full cursor-pointer rounded border-none p-0"
            />
          </div>
        )}

        <div className="border-t border-neutral-100 pt-2">
          <Slider
            label="Rotation"
            hintRight={`${activeEl.rotation ?? 0}°`}
            min={-180}
            max={180}
            value={activeEl.rotation ?? 0}
            onChange={(e) => onUpdate("rotation", Number(e.target.value))}
          />
        </div>

        <div className="border-t border-neutral-100 pt-2">
          <label className="mb-3 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={activeEl.shadowEnabled ?? false}
              onChange={(e) => onUpdate("shadowEnabled", e.target.checked)}
              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-bold uppercase text-neutral-500">Schatten aktivieren</span>
          </label>
          {activeEl.shadowEnabled && (
            <div className="grid grid-cols-2 gap-3 rounded border border-neutral-200 bg-neutral-50 p-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-neutral-500">Farbe</label>
                <input
                  type="color"
                  value={(activeEl.shadowColor ?? "#000000").slice(0, 7)}
                  onChange={(e) => onUpdate("shadowColor", `${e.target.value}80`)}
                  className="h-6 w-full cursor-pointer rounded border-none p-0"
                  title="Schattenfarbe"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-neutral-500">Blur</label>
                <Input
                  type="number"
                  value={activeEl.shadowBlur ?? 0}
                  onChange={(e) => onUpdate("shadowBlur", Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-neutral-500">X</label>
                <Input
                  type="number"
                  value={activeEl.shadowOffsetX ?? 0}
                  onChange={(e) => onUpdate("shadowOffsetX", Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-neutral-500">Y</label>
                <Input
                  type="number"
                  value={activeEl.shadowOffsetY ?? 0}
                  onChange={(e) => onUpdate("shadowOffsetY", Number(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-100 pt-2">
          <label className="mb-2 block text-xs font-bold text-neutral-500">Position & Dimensionen (px)</label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(["x", "y", "w", "h"] as const).map((axis) => (
              <div
                key={axis}
                className="flex items-center justify-between rounded border border-neutral-200 bg-neutral-50 p-1.5"
              >
                <span className="ml-1 font-bold uppercase text-neutral-500">{axis}</span>
                <input
                  type="number"
                  value={activeEl[axis]}
                  onChange={(e) => onUpdate(axis, Number(e.target.value))}
                  className="w-16 bg-transparent text-right font-medium outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
