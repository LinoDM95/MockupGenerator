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
}: Props) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={cn(
          "w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl duration-200 animate-in fade-in zoom-in-95",
          className,
        )}
      >
        <h3 id="modal-title" className="mb-2 text-xl font-bold text-neutral-900">
          {title}
        </h3>
        {message ? (
          <p className="mb-4 whitespace-pre-wrap text-neutral-600">{message}</p>
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
      </div>
    </div>
  );
};
