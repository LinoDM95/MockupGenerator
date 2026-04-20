import { Check } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "../../../lib/ui/cn";

export type AppTabStepButtonProps = {
  /** Aktiver Schritt (weiße Pill wie `SubNavTab`). */
  active: boolean;
  /** Abgeschlossen → grünes Häkchen statt Nummer. */
  done?: boolean;
  /** Anzeige 1, 2, 3 … wenn nicht `done`. */
  stepNumber: number;
  /** z. B. „1. Gelato“ oder Kurzlabel. */
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** Pro Seite eindeutig, damit `layoutId` nicht kollidiert. */
  activePillLayoutId?: string;
};

/**
 * Horizontale Tab-/Schritt-Buttons unter einem `AppPageSectionHeader`: gleiche Logik wie `SubNavTab`
 * — inaktiv kein weißer Kartenhintergrund, nur Hover; aktiv helle Pill mit Ring.
 */
export const AppTabStepButton = ({
  active,
  done = false,
  stepNumber,
  children,
  onClick,
  disabled = false,
  activePillLayoutId = "app-tab-step-pill",
}: AppTabStepButtonProps) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "relative flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors sm:px-4",
      disabled
        ? "cursor-not-allowed opacity-40"
        : active
          ? "text-slate-900"
          : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700",
    )}
  >
    {active && !disabled ? (
      <motion.div
        layoutId={activePillLayoutId}
        className="absolute inset-0 rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5"
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    ) : null}
    <span
      className={cn(
        "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        done
          ? "bg-emerald-500 text-white"
          : active
            ? "bg-indigo-600 text-white"
            : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-900/5",
      )}
      aria-hidden
    >
      {done ? <Check size={14} strokeWidth={2.5} /> : stepNumber}
    </span>
    <span className="relative z-10 min-w-0 truncate">{children}</span>
  </button>
);
