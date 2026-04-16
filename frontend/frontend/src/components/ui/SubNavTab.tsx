import type { LucideIcon } from "lucide-react";

import { cn } from "../../lib/cn";

export type SubNavTabProps = {
  label: string;
  /** Mobil-Kurzlabel (optional — sonst überall `label`) */
  shortLabel?: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
};

/**
 * Unter-Navigation im gleichen Rhythmus wie die Hauptnavigation in App.tsx
 * (Icon 18px, stroke 1.75, aktiver Unterstrich).
 */
export const SubNavTab = ({
  label,
  shortLabel,
  icon: Icon,
  active,
  onClick,
}: SubNavTabProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "relative flex min-w-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200 sm:gap-2 sm:px-4 sm:text-sm",
      active
        ? "text-indigo-600"
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
    )}
    aria-current={active ? "page" : undefined}
  >
    <Icon size={18} strokeWidth={1.75} className="shrink-0" />
    {shortLabel ? (
      <>
        <span className="hidden min-w-0 truncate sm:inline">{label}</span>
        <span className="truncate sm:hidden">{shortLabel}</span>
      </>
    ) : (
      <span className="min-w-0 truncate">{label}</span>
    )}
    {active ? (
      <span className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-indigo-600 sm:left-3 sm:right-3" />
    ) : null}
  </button>
);
