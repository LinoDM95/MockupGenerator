import type { ReactNode } from "react";

import { motion } from "framer-motion";

import { cn } from "../../../lib/cn";
import { WorkSessionFooter, type WorkSessionFooterProps } from "./WorkSessionFooter";

export type WorkSessionShellProps = {
  children: ReactNode;
  /** z. B. `z-[100]` wenn über einer anderen Shell (ZIP) */
  shellClassName?: string;
} & WorkSessionFooterProps;

/**
 * Vollflächige Arbeitssitzung: dunkles „Terminal“ ohne ablenkende Ambient-Effekte.
 */
export const WorkSessionShell = ({
  children,
  shellClassName,
  ...footerProps
}: WorkSessionShellProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
    className={cn(
      "fixed inset-0 z-[90] flex flex-col overflow-hidden bg-work-session-scrim",
      shellClassName,
    )}
    role="dialog"
    aria-modal="true"
    aria-labelledby="work-session-title"
  >
    <div id="work-session-title" className="sr-only">
      {footerProps.title}
    </div>

    <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden pt-14 sm:pt-16">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6">
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col"
        >
          {children}
        </motion.div>
      </div>

      <WorkSessionFooter {...footerProps} />
    </div>
  </motion.div>
);
