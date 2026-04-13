import { X } from "lucide-react";

import { cn } from "../../lib/cn";
import { useToastStore, type ToastVariant } from "../../store/toastStore";

const variantStyles: Record<ToastVariant, string> = {
  success:
    "border-emerald-200 bg-white text-emerald-950 shadow-emerald-100/80 ring-1 ring-emerald-100/90",
  error: "border-red-200 bg-white text-red-950 shadow-red-100/80 ring-1 ring-red-100/90",
  info: "border-neutral-200 bg-white text-neutral-900 shadow-md ring-1 ring-neutral-100/90",
};

export const Toaster = () => {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-[min(100vw-2rem,22rem)] flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto flex translate-y-0 items-start gap-3 rounded-xl border px-3.5 py-3 opacity-100 shadow-lg backdrop-blur-sm transition-[opacity,transform] duration-200 ease-out",
            variantStyles[t.variant],
          )}
        >
          <p className="min-w-0 flex-1 text-sm leading-snug">{t.message}</p>
          <button
            type="button"
            onClick={() => remove(t.id)}
            className="shrink-0 rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Meldung schließen"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
