import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

import { cn } from "../../lib/cn";
import { useToastStore, type ToastVariant } from "../../store/toastStore";

const variantStyles: Record<ToastVariant, string> = {
  success:
    "border-emerald-200 bg-white text-emerald-950 shadow-emerald-100/80 ring-1 ring-emerald-100/90",
  error: "border-red-200 bg-white text-red-950 shadow-red-100/80 ring-1 ring-red-100/90",
  info: "border-slate-200 bg-white text-slate-900 shadow-md ring-1 ring-slate-100/90",
};

export const Toaster = () => {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-[min(100vw-2rem,22rem)] flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions text"
    >
      <LayoutGroup>
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              role="status"
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 8, scale: 0.98 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 6, scale: 0.98 }
              }
              transition={{
                layout: { duration: 0.2, ease: "easeOut" },
                opacity: { duration: reduceMotion ? 0.12 : 0.18 },
                y: { duration: 0.2, ease: "easeOut" },
                scale: { duration: 0.2, ease: "easeOut" },
              }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-lg border px-3.5 py-3 shadow-lg backdrop-blur-sm",
                variantStyles[t.variant],
              )}
            >
              <p className="min-w-0 flex-1 text-sm leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Meldung schließen"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
};
