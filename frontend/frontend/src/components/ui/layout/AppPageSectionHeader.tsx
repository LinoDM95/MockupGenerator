import type { LucideIcon } from "lucide-react";

import { cn } from "../../../lib/ui/cn";

/** Tab- bzw. Bereichstitel (zweite Ebene unter `AppSubNavPageLayout`) — auch für Sonderköpfe (z. B. Zurück + Set-Name). */
export const appPageSectionTitleClassName =
  "text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100";

type AppPageSectionHeaderProps = {
  icon: LucideIcon;
  /** Tab- bzw. Bereichstitel unterhalb des Seitenkopfs (z. B. „Motive verarbeiten“). */
  title: string;
  description: string;
  /**
   * `centerSm`: zentriert Icon+Text auf schmalen Viewports (z. B. Upscaler-Leerzustand).
   * Standard: linksbündig wie Generator / Etsy.
   */
  align?: "start" | "centerSm";
  className?: string;
};

/**
 * Zweite Ebene unter `AppSubNavPageLayout`: nur Icon + Überschrift + Kurztext.
 * Keine Buttons oder Aktionen — die liegen in einer eigenen Zeile/Toolbar darunter.
 */
export const AppPageSectionHeader = ({
  icon: Icon,
  title,
  description,
  align = "start",
  className,
}: AppPageSectionHeaderProps) => {
  if (align === "centerSm") {
    return (
      <div className={cn("w-full min-w-0 pb-6", className)}>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-inset ring-slate-900/5 dark:bg-slate-800/60 dark:ring-white/10">
            <Icon className="text-slate-700 dark:text-slate-200" size={22} strokeWidth={1.5} aria-hidden />
          </div>
          <div className="text-center sm:text-left">
            <h2 className={appPageSectionTitleClassName}>{title}</h2>
            <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full min-w-0 pb-6", className)}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-inset ring-slate-900/5 dark:bg-slate-800/60 dark:ring-white/10">
          <Icon className="text-slate-700 dark:text-slate-200" size={22} strokeWidth={1.5} aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className={appPageSectionTitleClassName}>{title}</h2>
          <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
    </div>
  );
};
