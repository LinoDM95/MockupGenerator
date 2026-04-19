import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

import { cn } from "../../lib/cn";
import { useToastStore, type ToastVariant } from "../../store/toastStore";

const variantStyles: Record<ToastVariant, string> = {
  success:
    "bg-white text-slate-900 ring-1 ring-emerald-500/20 shadow-[0_8px_24px_rgba(0,0,0,0.08)] [&_svg]:text-emerald-500",
  error:
    "bg-white text-slate-900 ring-1 ring-red-500/20 shadow-[0_8px_24px_rgba(0,0,0,0.08)] [&_svg]:text-red-500",
  info:
    "bg-white text-slate-900 ring-1 ring-slate-900/5 shadow-[0_8px_24px_rgba(0,0,0,0.08)] [&_svg]:text-indigo-500",
};

export const Toaster = () => {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex w-[min(100vw-3rem,24rem)] flex-col gap-3"
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
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              transition={{
                layout: { duration: 0.2, ease: "easeOut" },
                duration: 0.2,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-4 transition-all",
                variantStyles[t.variant],
              )}
            >
              <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Meldung schließen"
              >
                <X size={16} strokeWidth={2} aria-hidden />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
};
