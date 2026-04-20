import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "../../../lib/ui/cn";

export type SubNavTabProps = {
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  /** z. B. Daten für den Ziel-Tab vorwärmen (nutzt Client-Caches). */
  onPointerEnter?: () => void;
  /** Eindeutig pro Nav (z. B. Workspace vs. Integrationen), damit layoutId nicht kollidiert. */
  activePillLayoutId?: string;
};

export const SubNavTab = ({
  label,
  shortLabel,
  icon: Icon,
  active,
  onClick,
  disabled = false,
  title,
  onPointerEnter,
  activePillLayoutId = "sub-nav-active-pill",
}: SubNavTabProps) => (
  <button
    type="button"
    onClick={onClick}
    onPointerEnter={onPointerEnter}
    disabled={disabled}
    title={title}
    className={cn(
      "relative flex min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors sm:px-4",
      disabled
        ? "cursor-not-allowed opacity-40"
        : active
          ? "text-slate-900"
          : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-700",
    )}
    aria-current={active ? "page" : undefined}
    aria-disabled={disabled || undefined}
  >
    {active && (
      <motion.div
        layoutId={activePillLayoutId}
        className="absolute inset-0 rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5"
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    )}
    <Icon size={16} strokeWidth={2} className="relative z-10 shrink-0" />
    <span className="relative z-10 hidden min-w-0 truncate sm:inline">{label}</span>
    <span className="relative z-10 truncate sm:hidden">{shortLabel ?? label}</span>
  </button>
);
