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
  <div className="max-h-48 space-y-1 overflow-y-auto overflow-x-hidden">
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
              className={`group flex cursor-pointer items-center justify-between rounded-[length:var(--pf-radius)] border p-2 text-xs font-medium transition-colors ${
                selectedElementId === el.id
                  ? "border-[color:var(--pf-accent-border)] bg-[color:var(--pf-accent-bg)] font-semibold text-[color:var(--pf-fg)]"
                  : "border-[color:var(--pf-border)] bg-[color:var(--pf-bg-elevated)] text-[color:var(--pf-fg-muted)] hover:bg-[color:var(--pf-bg-muted)]"
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
                  className="rounded p-0.5 text-[color:var(--pf-fg-subtle)] transition-colors hover:text-[color:var(--pf-accent)]"
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
                  className="rounded p-0.5 text-[color:var(--pf-fg-subtle)] transition-colors hover:text-[color:var(--pf-accent)]"
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
                  className="ml-1 rounded p-0.5 text-[color:var(--pf-fg-subtle)] transition-colors hover:text-emerald-600"
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
                  className="rounded p-0.5 text-[color:var(--pf-fg-subtle)] transition-colors hover:text-[color:var(--pf-danger)]"
                >
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
  </div>
);
