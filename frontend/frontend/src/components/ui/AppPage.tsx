import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

type AppPageProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Einheitlicher Seiten-Wrapper innerhalb von App-main (max-w-7xl): volle Breite,
 * vertikaler Rhythmus — kein zusätzliches max-w auf Feature-Ebene.
 */
export const AppPage = ({ children, className }: AppPageProps) => (
  <div className={cn("w-full min-w-0 space-y-8", className)}>{children}</div>
);
