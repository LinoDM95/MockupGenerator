import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

type Variant = "empty" | "queue";

const gridClass: Record<Variant, string> = {
  /** Upscaler Leerzustand: Engine links, Upload rechts (ca. 50/50). */
  empty:
    "grid gap-6 lg:grid-cols-2 lg:items-start xl:grid-cols-[minmax(22rem,26rem)_minmax(0,1fr)]",
  /** Mit Warteschlange: 5/12 Engine, 7/12 Bilder — gleiche Reihenfolge wie `empty`. */
  queue: "grid gap-6 lg:grid-cols-12 lg:items-start",
};

const primaryClass: Record<Variant, string> = {
  empty:
    "order-2 min-w-0 space-y-4 lg:order-1 lg:sticky lg:top-4 lg:z-10 lg:self-start",
  queue:
    "order-2 min-w-0 space-y-4 lg:order-1 lg:sticky lg:top-4 lg:z-10 lg:col-span-5 lg:self-start",
};

const secondaryClass: Record<Variant, string> = {
  empty: "order-1 min-w-0 space-y-4 lg:order-2",
  queue: "order-1 min-w-0 space-y-4 lg:order-2 lg:col-span-7",
};

type Props = {
  variant: Variant;
  /** Typisch Engine / Einstellungen — auf `lg` links. */
  primary: ReactNode;
  /** Typisch Upload / Raster — auf `lg` rechts. */
  secondary: ReactNode;
  primaryAriaLabel?: string;
  secondaryAriaLabel?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
};

/**
 * Zwei-Spalten-Workspace: mobile zuerst Inhalt der rechten Spalte (`secondary`),
 * ab `lg` Engine links (`primary`). Verhindert, dass sich das Layout zwischen
 * Leerzustand und Queue unterscheidet.
 */
export const WorkspaceEngineSplitLayout = ({
  variant,
  primary,
  secondary,
  primaryAriaLabel,
  secondaryAriaLabel,
  primaryClassName,
  secondaryClassName,
}: Props) => (
  <div className={gridClass[variant]}>
    <aside
      aria-label={primaryAriaLabel}
      className={cn(primaryClass[variant], primaryClassName)}
    >
      {primary}
    </aside>
    <section
      aria-label={secondaryAriaLabel}
      className={cn(secondaryClass[variant], secondaryClassName)}
    >
      {secondary}
    </section>
  </div>
);
