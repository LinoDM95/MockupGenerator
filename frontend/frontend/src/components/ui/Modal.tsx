import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

import { Button } from "./Button";

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
};

const quick = { duration: 0.15, ease: "easeOut" } as const;

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
}: Props) => (
  <AnimatePresence>
    {isOpen ? (
      <motion.div
        key="modal-overlay"
        role="presentation"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={cn(
            "w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl",
            className,
          )}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={quick}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id="modal-title" className="mb-2 text-lg font-semibold text-slate-900">
            {title}
          </h3>
          {message ? (
            <p className="mb-4 whitespace-pre-wrap text-sm text-slate-600">{message}</p>
          ) : null}
          {children}
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button type="button" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);
