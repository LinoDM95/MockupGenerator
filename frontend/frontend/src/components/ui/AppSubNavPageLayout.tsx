import { LayoutGroup } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

type AppSubNavPageLayoutProps = {
  /** Seitentitel (Haupt-Tab: Erstellen, Verbreiten, …) */
  title: string;
  description: string;
  /** Unter-Tabs rechts; weglassen wenn die Seite keine Sub-Navigation hat. */
  subNav?: ReactNode;
  /** Nur nötig wenn `subNav` gesetzt ist (Screenreader). */
  subNavAriaLabel?: string;
  children: ReactNode;
  className?: string;
  /** Zusätzliche Klassen für den Bereich unter dem Kopf (Standard: `pt-8`). */
  contentClassName?: string;
};

/**
 * Einheitlicher Seitenkopf für alle Haupt-Tabs: Titel + Beschreibung, optional Sub-Navigation (`SubNavTab`),
 * danach der Seiteninhalt. Anpassungen hier wirken app-weit.
 */
export const AppSubNavPageLayout = ({
  title,
  description,
  subNav,
  subNavAriaLabel = "Unterbereich wechseln",
  children,
  className,
  contentClassName,
}: AppSubNavPageLayoutProps) => (
  <div className={cn("w-full min-w-0", className)}>
    <header className="w-full min-w-0 pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
        {subNav ? (
          <LayoutGroup>
            <nav
              className="flex flex-wrap items-center justify-end gap-0.5 sm:gap-1"
              aria-label={subNavAriaLabel}
            >
              {subNav}
            </nav>
          </LayoutGroup>
        ) : null}
      </div>
    </header>
    <div className={cn("w-full min-w-0 pt-8", contentClassName)}>{children}</div>
  </div>
);
