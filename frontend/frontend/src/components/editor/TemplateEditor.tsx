import { ArrowLeft, Save } from "lucide-react";
import { useState } from "react";

import { patchTemplate, replaceTemplateElements } from "../../api/sets";
import { newClientElementId } from "../../lib/elementId";
import { toast } from "../../lib/toast";
import type { ElementType, TemplateElement } from "../../types/mockup";
import { useAppStore } from "../../store/appStore";
import { Button } from "../ui/Button";
import { CanvasViewport } from "./CanvasViewport";
import { LayerManager } from "./LayerManager";
import { PropertiesPanel } from "./PropertiesPanel";
import { Toolbar } from "./Toolbar";

type Props = {
  onClose: () => void;
  onSaved: () => void | Promise<void>;
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

  if (!editingTemplate) return null;

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
      await patchTemplate(editingTemplate.id, { name: editingTemplate.name });
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

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:p-6">
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
        <Button type="button" onClick={handleSave} disabled={saving} className="gap-2 px-6 py-2 font-bold">
          <Save size={18} /> {saving ? "Speichern…" : "Speichern"}
        </Button>
      </div>

      <Toolbar
        isDrawMode={isDrawMode}
        onToggleDrawMode={handleToggleDraw}
        onAddElement={addElement}
      />

      <div className="grid h-[650px] grid-cols-1 gap-6 select-none lg:grid-cols-4">
        <CanvasViewport
          editingTemplate={editingTemplate}
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

        <div className="flex flex-col gap-4 overflow-y-auto pr-1 lg:col-span-1">
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
  );
};
