import { LayoutGroup } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "../../../lib/ui/cn";

type AppSubNavPageLayoutProps = {
  /** Seitentitel (Haupt-Tab: Erstellen, Verbreiten, …) */
  title: string;
  description: string;
  /** Kein H1/Lead — mehr Platz für die Arbeitsfläche (z. B. Erstellen, Publizieren). */
  hideTitle?: boolean;
  /** Unter-Tabs rechts; weglassen wenn die Seite keine Sub-Navigation hat. */
  subNav?: ReactNode;
  /** Nur nötig wenn `subNav` gesetzt ist (Screenreader). */
  subNavAriaLabel?: string;
  children: ReactNode;
  className?: string;
  /** Zusätzliche Klassen für den Bereich unter dem Kopf (Standard: `pt-8` bzw. `pt-0` bei `hideTitle` ohne Sub-Nav). */
  contentClassName?: string;
};

/**
 * Einheitlicher Seitenkopf für alle Haupt-Tabs: Titel + Beschreibung, optional Sub-Navigation (`SubNavTab`),
 * danach der Seiteninhalt. Anpassungen hier wirken app-weit.
 */
export const AppSubNavPageLayout = ({
  title,
  description,
  hideTitle = false,
  subNav,
  subNavAriaLabel = "Unterbereich wechseln",
  children,
  className,
  contentClassName,
}: AppSubNavPageLayoutProps) => {
  const defaultContentPt =
    hideTitle && !subNav ? "pt-0" : hideTitle && subNav ? "pt-0" : "pt-8";

  return (
    <div className={cn("w-full min-w-0", className)}>
      {!hideTitle ? (
        <header className="w-full min-w-0 pb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {title}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{description}</p>
            </div>
            {subNav ? (
              <LayoutGroup>
                <nav
                  className="flex w-full min-w-0 flex-wrap items-center justify-start gap-0.5 sm:w-auto sm:justify-end sm:gap-1"
                  aria-label={subNavAriaLabel}
                >
                  {subNav}
                </nav>
              </LayoutGroup>
            ) : null}
          </div>
        </header>
      ) : subNav ? (
        <header className="w-full min-w-0 pb-4">
          <LayoutGroup>
            <nav
              className="flex w-full min-w-0 flex-wrap items-center justify-end gap-1"
              aria-label={subNavAriaLabel}
            >
              {subNav}
            </nav>
          </LayoutGroup>
        </header>
      ) : null}
      <div className={cn("w-full min-w-0", defaultContentPt, contentClassName)}>
        {children}
      </div>
    </div>
  );
};
