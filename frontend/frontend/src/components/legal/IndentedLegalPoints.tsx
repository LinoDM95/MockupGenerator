import type { ReactNode } from "react";

import { cn } from "../../lib/ui/cn";

export const IndentedLegalPoints = ({ children }: { children: ReactNode }) => (
  <div className="mt-3 space-y-2.5">{children}</div>
);

export const IndentedLegalPoint = ({ children }: { children: ReactNode }) => (
  <p
    className={cn(
      "rounded-xl bg-slate-50/90 py-2.5 pl-4 pr-3 text-slate-700 ring-1 ring-inset ring-slate-900/5 dark:bg-slate-800/50 dark:text-slate-300 dark:ring-white/10",
    )}
  >
    {children}
  </p>
);
