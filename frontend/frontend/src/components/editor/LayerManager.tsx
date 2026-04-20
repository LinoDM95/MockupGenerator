import { AnimatePresence, motion } from "framer-motion";
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
  if (el.type === "placeholder") return <ImageIcon size={14} className="shrink-0 text-indigo-500" strokeWidth={1.75} />;
  if (el.type === "text") return <Type size={14} className="shrink-0 text-purple-500" strokeWidth={1.75} />;
  return <Square size={14} className="shrink-0 text-amber-500" strokeWidth={1.75} />;
};

export const LayerManager = ({
  editingTemplate,
  selectedElementId,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
}: Props) => (
  <div className="rounded-xl bg-slate-50/50 p-3 ring-1 ring-inset ring-slate-900/5">
    <h3 className="mb-2 px-1 text-sm font-semibold text-slate-800">
      Ebenen ({editingTemplate.elements.length})
    </h3>
    <div className="max-h-40 space-y-1 overflow-y-auto overflow-x-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        {[...editingTemplate.elements].reverse().map((el) => (
          <motion.div
            key={el.id}
            layout="position"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: "transform, opacity" }}
            className="overflow-hidden"
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelect(el.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(el.id);
              }}
              className={`group flex cursor-pointer items-center justify-between rounded-lg border p-2 text-xs transition-colors ${
                selectedElementId === el.id
                  ? "border-indigo-300 bg-indigo-50 font-semibold text-indigo-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2 truncate">
                {iconFor(el)}
                <span className="truncate">{el.name || el.type}</span>
              </div>
              <div className="flex gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  aria-label="Ebene nach oben"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(el.id, "up");
                  }}
                  className="rounded p-0.5 transition-colors hover:text-indigo-600"
                >
                  <ArrowUp size={14} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  aria-label="Ebene nach unten"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(el.id, "down");
                  }}
                  className="rounded p-0.5 transition-colors hover:text-indigo-600"
                >
                  <ArrowDown size={14} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  aria-label="Duplizieren"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(el.id);
                  }}
                  className="ml-1 rounded p-0.5 transition-colors hover:text-emerald-600"
                >
                  <Copy size={14} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  aria-label="Löschen"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(el.id);
                  }}
                  className="rounded p-0.5 transition-colors hover:text-red-500"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  </div>
);
