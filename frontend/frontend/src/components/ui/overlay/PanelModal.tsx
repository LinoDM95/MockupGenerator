import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "../../../lib/ui/cn";

type Props = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** Breite des Inhalts (Standard: große Formulare). */
  size?: "lg" | "xl" | "2xl";
};

const maxWidth: Record<NonNullable<Props["size"]>, string> = {
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-5xl",
};

/**
 * Vollflächiges Overlay mit scrollbarem Inhalt — für Einstellungen, die nicht
 * am Seitenende erscheinen sollen (z. B. Integrations-Hub).
 * `z-[230]` über App-Header (`z-[220]`).
 */
export const PanelModal = ({
  isOpen,
  title,
  onClose,
  children,
  className,
  size = "xl",
}: Props) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="panel-modal-overlay"
          className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:p-6"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            key="panel-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-modal-title"
            className={cn(
              "relative flex max-h-[min(92vh,920px)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_48px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5",
              maxWidth[size],
              className,
            )}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <h2
                id="panel-modal-title"
                className="min-w-0 text-lg font-semibold tracking-tight text-slate-900"
              >
                {title}
              </h2>
              <button
                type="button"
                className="shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
                aria-label="Schließen"
                onClick={onClose}
              >
                <X size={20} strokeWidth={2} aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
              {children}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};
