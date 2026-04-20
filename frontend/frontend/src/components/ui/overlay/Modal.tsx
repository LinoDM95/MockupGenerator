import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "../../../lib/ui/cn";
import { Button } from "../primitives/Button";

type Props = {
  isOpen: boolean;
  title: string;
  message?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
  /** Ersetzt die Standard-Abbrechen/Bestätigen-Leiste (z. B. Formular mit eigenem Absenden). */
  footer?: ReactNode;
};

const appleEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const Modal = ({
  isOpen,
  title,
  message,
  children,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  onConfirm,
  onCancel,
  className,
  footer,
}: Props) => (
  <AnimatePresence>
    {isOpen ? (
      <motion.div
        key="modal-overlay"
        role="presentation"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm dark:bg-slate-950/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: appleEase }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={cn(
            "relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white p-8 shadow-[0_24px_48px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5 dark:bg-slate-900 dark:shadow-[0_24px_48px_rgba(0,0,0,0.5)] dark:ring-white/10",
            className,
          )}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -10 }}
          transition={{ duration: 0.4, ease: appleEase }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3
            id="modal-title"
            className="mb-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            {title}
          </h3>
          {message ? (
            <p className="mb-6 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              {message}
            </p>
          ) : null}
          {children}
          {footer !== undefined ? (
            <div className="mt-8">{footer}</div>
          ) : (
            <div className="mt-8 flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button type="button" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);
