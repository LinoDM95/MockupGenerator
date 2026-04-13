import { ArrowDown, ArrowUp, Copy, Image as ImageIcon, Square, Trash2, Type } from "lucide-react";

import type { Template, TemplateElement } from "../../types/mockup";

type Props = {
  editingTemplate: Template;
  selectedElementId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
};

const iconFor = (el: TemplateElement) => {
  if (el.type === "placeholder") return <ImageIcon size={14} className="shrink-0 text-blue-500" />;
  if (el.type === "text") return <Type size={14} className="shrink-0 text-purple-500" />;
  return <Square size={14} className="shrink-0 text-orange-500" />;
};

export const LayerManager = ({
  editingTemplate,
  selectedElementId,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
}: Props) => (
  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
    <h3 className="mb-2 px-1 text-sm font-bold text-neutral-800">
      Ebenen ({editingTemplate.elements.length})
    </h3>
    <div className="max-h-40 space-y-1 overflow-y-auto">
      {[...editingTemplate.elements].reverse().map((el) => (
        <div
          key={el.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(el.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onSelect(el.id);
          }}
          className={`flex cursor-pointer items-center justify-between rounded-lg border p-2 text-xs ${
            selectedElementId === el.id
              ? "border-blue-300 bg-blue-50 font-bold"
              : "border-neutral-200 bg-white hover:bg-neutral-100"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2 truncate">
            {iconFor(el)}
            <span className="truncate">{el.name || el.type}</span>
          </div>
          <div className="flex gap-1 opacity-60">
            <button
              type="button"
              aria-label="Ebene nach oben"
              onClick={(e) => {
                e.stopPropagation();
                onMove(el.id, "up");
              }}
              className="hover:text-blue-600"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              aria-label="Ebene nach unten"
              onClick={(e) => {
                e.stopPropagation();
                onMove(el.id, "down");
              }}
              className="hover:text-blue-600"
            >
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              aria-label="Duplizieren"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(el.id);
              }}
              className="ml-1 hover:text-green-600"
            >
              <Copy size={14} />
            </button>
            <button
              type="button"
              aria-label="Löschen"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(el.id);
              }}
              className="hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);
