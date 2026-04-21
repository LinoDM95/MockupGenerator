import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "../../lib/ui/cn";

import { PixelglyphLoader } from "./PixelglyphLoader";

export type LoadingOverlayProps = {
  /** Steuert Ein- und Ausblendung (mit Exit-Animation über AnimatePresence). */
  show: boolean;
  /** Kurzer Hinweis unter dem Glyph (optional). */
  message?: string;
  /**
   * `true`: `fixed inset-0` über den Viewport.
   * `false`: `absolute inset-0` — umschließendes Element braucht `position: relative`.
   */
  fullScreen?: boolean;
  className?: string;
  /** Zusätzlicher Inhalt unter der Nachricht (selten nötig). */
  children?: ReactNode;
};

const fade = { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const };

/**
 * Blockiert Interaktionen im abgedeckten Bereich während asynchroner Arbeiten (Doppelklick-Schutz).
 */
export const LoadingOverlay = ({
  show,
  message,
  fullScreen = true,
  className,
  children,
}: LoadingOverlayProps) => (
  <AnimatePresence>
    {show ? (
      <motion.div
        key="loading-overlay"
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={cn(
          "inset-0 z-50 flex items-center justify-center",
          fullScreen ? "fixed" : "absolute",
          "bg-slate-50/60 backdrop-blur-sm dark:bg-slate-900/60",
          className,
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={fade}
      >
        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <PixelglyphLoader />
          {message ? (
            <p className="max-w-xs text-sm font-medium tracking-tight text-slate-600 dark:text-slate-300">
              {message}
            </p>
          ) : null}
          {children}
        </div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);
